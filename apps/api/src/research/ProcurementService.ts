import { readPaymentRequired } from '@agentflow/x402-client';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PaymentTool, ApprovalRequiredError } from '../agent/PaymentTool.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import type { UserSpendingPolicy } from '../agent/types.js';
import crypto from 'node:crypto';

export class ProcurementService {
  constructor(
    private readonly researchRepo: ResearchRepository,
    private readonly paymentRepo: PrismaPaymentRepository,
    private readonly paymentTool: PaymentTool
  ) {}

  /**
   * Resumes or starts a procurement from an approved PaidResourceRecommendation.
   */
  async executeProcurement(
    sessionId: string,
    recommendationId: string,
    policy: UserSpendingPolicy,
    isHumanApproved: boolean = false
  ): Promise<{ status: string; payload?: unknown }> {
    const session = await this.researchRepo.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const recommendation = await this.researchRepo['db'].paidResourceRecommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation || recommendation.researchSessionId !== sessionId) {
      throw new Error(`Recommendation ${recommendationId} not found or mismatch`);
    }

    const remainingBudget = session.researchBudget - session.spent;
    if (recommendation.price > remainingBudget) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'DENIED' };
    }

    // 1. Re-fetch current 402 requirements
    const fetchRes = await fetch(recommendation.serviceUrl);
    if (fetchRes.status !== 402) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    const requirement = readPaymentRequired(fetchRes);
    if (!requirement) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    // 2. Validate current requirements against recommendation
    if (
      requirement.rawAmount !== recommendation.price ||
      requirement.asset !== recommendation.asset ||
      requirement.network !== recommendation.network
    ) {
      console.error('Validation failed: requirement vs recommendation mismatch', { requirement, recommendation });
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    // Ensure rawAmount is within budget again just to be strictly safe
    if (requirement.rawAmount > remainingBudget) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'DENIED' };
    }

    // 3. Execute PaymentTool
    try {
      // PaymentTool will evaluate policy. If requireApprovalAbove is hit, it throws ApprovalRequiredError.
      // If we are resuming after human approval, the policy still needs to pass unless we explicitly allow it.
      // We modify the policy object temporarily to allow this specific amount if human approved.
      const executionPolicy = isHumanApproved 
        ? { ...policy, requireApprovalAbove: Math.max(policy.requireApprovalAbove, requirement.rawAmount + 1) }
        : policy;

      const result = await this.paymentTool.fetchResource(recommendation.serviceUrl, executionPolicy, 'Procurement for Research');

      // 4. Link PaymentRecord
      if (result.metadata?.paymentRecordId) {
        await this.paymentRepo.updatePayment(result.metadata.paymentRecordId, { researchSessionId: sessionId });
      }

      // 5. Success Flow
      const contentHash = crypto.createHash('sha256').update(result.data).digest('hex');
      
      await this.researchRepo.addCitation({
        researchSessionId: sessionId,
        url: recommendation.serviceUrl,
        title: recommendation.service,
        snippet: 'Paid Resource acquired via ProcurementService',
        sourceType: 'X402_RESOURCE',
        provider: 'x402-bazaar',
        isPaid: true,
        cost: requirement.rawAmount,
        purchaseId: result.metadata?.paymentRecordId,
        contentHash,
        retrievedAt: new Date()
      });

      // Atomically update spent
      await this.researchRepo.updateSpent(sessionId, requirement.rawAmount);
      await this.researchRepo.updateStatus(sessionId, ResearchState.RESOURCE_ACQUIRED);

      return { status: 'SUCCESS', payload: { transactionId: result.metadata?.transactionId, amount: requirement.rawAmount } };
      
    } catch (e: unknown) {
      if (e instanceof ApprovalRequiredError) {
        // Link the payment record to session
        const approvalReq = await this.paymentRepo.getApprovalRequest(e.payload.approvalId);
        if (approvalReq) {
          await this.paymentRepo.updatePayment(approvalReq.paymentRecordId, { researchSessionId: sessionId });
        }
        
        await this.researchRepo.updateStatus(sessionId, ResearchState.PENDING_APPROVAL);
        return { status: 'REQUIRES_APPROVAL', payload: e.payload };
      }

      // Payment failed
      await this.researchRepo.updateStatus(sessionId, ResearchState.FAILED);
      return { status: 'FAILED', payload: { error: e instanceof Error ? e.message : String(e) } };
    }
  }

  /**
   * Resumes a procurement from a HITL approval.
   */
  async resumeApproval(
    approvalId: string,
    policy: UserSpendingPolicy
  ): Promise<{ status: string; payload?: unknown }> {
    const approval = await this.paymentRepo.getApprovalRequest(approvalId);
    if (!approval) throw new Error('Approval request not found');

    const paymentRecord = await this.paymentRepo.getPaymentById(approval.paymentRecordId);
    if (!paymentRecord || !paymentRecord.researchSessionId) {
      throw new Error('Associated payment record or research session not found');
    }
    if (paymentRecord.status === 'SUCCESS') {
      throw new Error('Payment has already been successfully executed.');
    }
    if (paymentRecord.decision !== 'APPROVED') {
      throw new Error(`Cannot resume payment. Decision is ${paymentRecord.decision}`);
    }
    const ageMs = Date.now() - new Date(paymentRecord.timestamp).getTime();
    console.log('Age of payment record in ms:', ageMs);
    if (ageMs > 24 * 3600 * 1000) {
      throw new Error('Payment approval has expired (older than 24 hours).');
    }
    const sessionId = paymentRecord.researchSessionId;

    const remainingBudget = (await this.researchRepo.getSession(sessionId))!.researchBudget - (await this.researchRepo.getSession(sessionId))!.spent;

    // 1. Re-fetch current 402 requirements
    const fetchRes = await fetch(approval.resourceUrl);
    if (fetchRes.status !== 402) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    const requirement = readPaymentRequired(fetchRes);
    if (!requirement) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    // 2. Validate current requirements against original approval
    if (
      requirement.rawAmount !== approval.amount ||
      requirement.asset !== approval.asset ||
      requirement.network !== approval.network
    ) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    if (requirement.rawAmount > remainingBudget) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'DENIED' };
    }

    // 3. Execute PaymentTool with bypassed policy for the approved amount
    try {
      const executionPolicy = { ...policy, requireApprovalAbove: Math.max(policy.requireApprovalAbove, requirement.rawAmount + 1) };
      const result = await this.paymentTool.fetchResource(approval.resourceUrl, executionPolicy, 'Procurement for Research');

      // Update payment record transaction ID and status
      await this.paymentRepo.updatePayment(paymentRecord.id, { 
        status: 'SUCCESS', 
        transactionId: result.metadata?.transactionId 
      });

      const contentHash = crypto.createHash('sha256').update(result.data).digest('hex');
      
      await this.researchRepo.addCitation({
        researchSessionId: sessionId,
        url: approval.resourceUrl,
        title: 'Paid Resource (Approved)',
        snippet: 'Paid Resource acquired via ProcurementService (HITL)',
        sourceType: 'X402_RESOURCE',
        provider: 'x402-bazaar',
        isPaid: true,
        cost: requirement.rawAmount,
        purchaseId: paymentRecord.id,
        contentHash,
        retrievedAt: new Date()
      });

      await this.researchRepo.updateSpent(sessionId, requirement.rawAmount);
      await this.researchRepo.updateStatus(sessionId, ResearchState.RESOURCE_ACQUIRED);

      return { status: 'SUCCESS', payload: { transactionId: result.metadata?.transactionId, amount: requirement.rawAmount } };
      
    } catch (e: unknown) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.FAILED);
      return { status: 'FAILED', payload: { error: e instanceof Error ? e.message : String(e) } };
    }
  }
}
