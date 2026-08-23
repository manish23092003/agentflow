import { readPaymentRequired } from '@agentflow/x402-client';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PaymentTool, ApprovalRequiredError } from '../agent/PaymentTool.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import type { UserSpendingPolicy } from '../agent/types.js';
import crypto from 'node:crypto';
import { researchEvents } from './ResearchEventService.js';

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
      researchEvents.emitSessionState(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'DENIED' };
    }

    // 1. Re-fetch current 402 requirements
    const fetchRes = await fetch(recommendation.serviceUrl);
    if (fetchRes.status !== 402) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      researchEvents.emitSessionState(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    const requirement = readPaymentRequired(fetchRes);
    if (!requirement) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      researchEvents.emitSessionState(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    // 2. Validate current requirements against recommendation
    if (
      Number(requirement.rawAmount) !== Number(recommendation.price) ||
      String(requirement.asset) !== String(recommendation.asset) ||
      requirement.network !== recommendation.network
    ) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      researchEvents.emitSessionState(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      return { status: 'ALTERNATIVE_REQUIRED' };
    }

    // Ensure rawAmount is within budget again just to be strictly safe
    if (requirement.rawAmount > remainingBudget) {
      await this.researchRepo.updateStatus(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      researchEvents.emitSessionState(sessionId, ResearchState.ALTERNATIVE_DISCOVERY);
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

      researchEvents.emitPaymentStarted(sessionId, '', requirement.rawAmount, requirement.asset);
      const result = await this.paymentTool.fetchResource(recommendation.serviceUrl, executionPolicy, 'Procurement for Research');
      researchEvents.emitPaymentSettled(sessionId, result.metadata?.transactionId || '');

      // 4. Link PaymentRecord
      if (result.metadata?.paymentRecordId) {
        await this.paymentRepo.updatePayment(result.metadata.paymentRecordId, { researchSessionId: sessionId });
      }

      // 5. Success Flow
      const contentHash = crypto.createHash('sha256').update(result.data).digest('hex');
      
      let parsedTitle = recommendation.service || 'External x402 Resource';
      let parsedSnippet = result.data?.slice(0, 300) || 'Paid Resource acquired via ProcurementService';
      try {
        const parsed = JSON.parse(result.data);
        if (parsed.title) parsedTitle = parsed.title;
        if (parsed.summary) parsedSnippet = parsed.summary;
        else if (parsed.insight) parsedSnippet = parsed.insight;
        else if (parsed.report) parsedSnippet = typeof parsed.report === 'object' ? JSON.stringify(parsed.report) : String(parsed.report);
      } catch {
        // fallback
      }

      await this.researchRepo.addCitation({
        researchSessionId: sessionId,
        url: recommendation.serviceUrl,
        title: parsedTitle,
        snippet: parsedSnippet,
        sourceType: 'X402_RESOURCE',
        provider: 'External x402 Provider',
        isPaid: true,
        cost: requirement.rawAmount,
        purchaseId: result.metadata?.paymentRecordId,
        contentHash,
        retrievedAt: new Date()
      });

      // Atomically update spent
      await this.researchRepo.updateSpent(sessionId, requirement.rawAmount);
      await this.researchRepo.updateStatus(sessionId, ResearchState.RESOURCE_ACQUIRED);
      researchEvents.emitSessionState(sessionId, ResearchState.RESOURCE_ACQUIRED);
      researchEvents.emitResourceAcquired(sessionId, recommendation.serviceUrl);

      return { status: 'SUCCESS', payload: { transactionId: result.metadata?.transactionId, amount: requirement.rawAmount } };
      
    } catch (e: unknown) {
      if (e instanceof ApprovalRequiredError) {
        // Link the payment record to session
        const approvalReq = await this.paymentRepo.getApprovalRequest(e.payload.approvalId);
        if (approvalReq) {
          await this.paymentRepo.updatePayment(approvalReq.paymentRecordId, { researchSessionId: sessionId });
        }
        
        await this.researchRepo.updateStatus(sessionId, ResearchState.PENDING_APPROVAL);
        researchEvents.emitSessionState(sessionId, ResearchState.PENDING_APPROVAL);
        researchEvents.emitApprovalRequired(sessionId, e.payload.approvalId, {
          service: recommendation.service,
          amount: Number(e.payload.amount),
          asset: e.payload.asset,
          network: e.payload.network,
          reason: e.payload.reason,
          expectedValue: recommendation.expectedValue,
          remainingBudget
        });
        return { status: 'REQUIRES_APPROVAL', payload: e.payload };
      }

      // Payment failed
      await this.researchRepo.updateStatus(sessionId, ResearchState.FAILED);
      researchEvents.emitSessionState(sessionId, ResearchState.FAILED);
      return { status: 'FAILED', payload: { error: e instanceof Error ? e.message : String(e) } };
    }
  }

  /**
   * Resumes a procurement from a HITL approval.
   */
  async resumeApproval(
    approvalId: string,
    policy: UserSpendingPolicy,
    signedTransactionBase64: string
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
    if (paymentRecord.decision !== 'APPROVED' && paymentRecord.decision !== 'REQUIRES_APPROVAL') {
      throw new Error(`Cannot resume payment. Decision is ${paymentRecord.decision}`);
    }
    const ageMs = Date.now() - new Date(paymentRecord.timestamp).getTime();
    console.log('Age of payment record in ms:', ageMs);
    if (ageMs > 24 * 3600 * 1000) {
      throw new Error('Payment approval has expired (older than 24 hours).');
    }
    const sessionId = paymentRecord.researchSessionId;

    const remainingBudget = (await this.researchRepo.getSession(sessionId))!.researchBudget - (await this.researchRepo.getSession(sessionId))!.spent;

    // Skip the redundant check here since we aren't fetching the resource's 402 header again
    if (approval.amount > remainingBudget) {
      // Don't permanently fail, return DENIED
      return { status: 'DENIED', payload: { error: 'Insufficient budget' } };
    }

    // 3. Execute PaymentTool with the provided signature
    try {
      researchEvents.emitPaymentStarted(sessionId, '', approval.amount, approval.asset);
      const data = await this.paymentTool.resumePaymentWithSignature(approval, signedTransactionBase64);
      researchEvents.emitPaymentSettled(sessionId, 'tx-from-pera'); // TxID could be decoded, but for now this is ok

      // Update payment record transaction ID and status
      await this.paymentRepo.updatePayment(paymentRecord.id, { 
        status: 'SUCCESS', 
        transactionId: 'tx-from-pera',
        decision: 'APPROVED'
      });

      const contentHash = crypto.createHash('sha256').update(data).digest('hex');
      
      let parsedTitle = 'External x402 Resource';
      let parsedSnippet = data?.slice(0, 300) || 'Paid Resource acquired via ProcurementService (HITL)';
      try {
        const parsed = JSON.parse(data);
        if (parsed.title) parsedTitle = parsed.title;
        if (parsed.summary) parsedSnippet = parsed.summary;
        else if (parsed.insight) parsedSnippet = parsed.insight;
        else if (parsed.report) parsedSnippet = typeof parsed.report === 'object' ? JSON.stringify(parsed.report) : String(parsed.report);
      } catch {
        // fallback
      }

      await this.researchRepo.addCitation({
        researchSessionId: sessionId,
        url: approval.resourceUrl,
        title: parsedTitle,
        snippet: parsedSnippet,
        sourceType: 'X402_RESOURCE',
        provider: 'External x402 Provider',
        isPaid: true,
        cost: approval.amount,
        purchaseId: paymentRecord.id,
        contentHash,
        retrievedAt: new Date()
      });

      await this.researchRepo.updateSpent(sessionId, approval.amount);
      await this.researchRepo.updateStatus(sessionId, ResearchState.RESOURCE_ACQUIRED);
      researchEvents.emitSessionState(sessionId, ResearchState.RESOURCE_ACQUIRED);
      researchEvents.emitResourceAcquired(sessionId, approval.resourceUrl);

      return { status: 'SUCCESS', payload: { transactionId: 'tx-from-pera', amount: approval.amount } };
      
    } catch (e: unknown) {
      console.error('resumeApproval payment failed:', e);
      // DO NOT update session to FAILED so the user can retry.
      // Just return FAILED status and let the frontend show the error.
      return { status: 'FAILED', payload: { error: e instanceof Error ? e.message : String(e) } };
    }
  }
}
