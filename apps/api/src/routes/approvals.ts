import { Router, Request, Response } from 'express';
import { readPaymentRequired } from '@agentflow/x402-client';
import { prisma } from '../db/prisma.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { SigningService } from '../security/SigningService.js';
import type { UserSpendingPolicy } from '../agent/types.js';

const router = Router();
const db = new PrismaPaymentRepository();
const policyEngine = new PolicyEngine(db);
const signingService = new SigningService();

// Mock policy for phase 5 since we don't have user management yet
const mockPolicy: UserSpendingPolicy = {
  maxPerTransaction: 100000000, 
  dailyLimit: 1000000000,
  allowedAssets: [10458941], // USDC on Algorand TestNet
  allowedNetworks: ['testnet', 'algorand-testnet', 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='],
  requireApprovalAbove: 5000 // 0.005 USDC
};

router.get('/:approvalId', async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.approvalId as string;
    const approval = await db.getApprovalRequest(approvalId);
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    res.json(approval);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post('/reject/:approvalId', async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.approvalId as string;
    const approval = await db.getApprovalRequest(approvalId);
    
    if (!approval) {
      return res.status(404).json({ status: 'FAILED', reason: 'Approval request not found' });
    }
    
    if (approval.status !== 'PENDING') {
      return res.status(400).json({ status: 'FAILED', reason: `Approval request is already ${approval.status}` });
    }

    if (new Date(approval.expiresAt) < new Date()) {
      await db.updateApprovalRequest(approvalId, { status: 'EXPIRED' });
      return res.status(400).json({ status: 'FAILED', reason: 'Approval request expired' });
    }

    // Atomic update
    const updated = await prisma.approvalRequest.updateMany({
      where: { id: approvalId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        resolvedBy: 'user', // Mock user
        resolutionReason: 'user_rejected'
      }
    });

    if (updated.count === 0) {
      return res.status(409).json({ status: 'FAILED', reason: 'Race condition: Approval request no longer pending' });
    }

    await db.updateStatus(approval.paymentRecordId, { status: 'FAILED' }); // or leave PENDING_APPROVAL? The user says leave unpaid. "FAILED" is appropriate since it won't be paid.

    res.json({
      status: 'REJECTED',
      approvalId,
      reason: 'user_rejected'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post('/approve/:approvalId', async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.approvalId as string;
    const approval = await db.getApprovalRequest(approvalId);
    
    if (!approval) {
      return res.status(404).json({ status: 'FAILED', reason: 'Approval request not found' });
    }
    
    if (approval.status !== 'PENDING') {
      return res.status(400).json({ status: 'FAILED', reason: `Approval request is already ${approval.status}` });
    }

    if (new Date(approval.expiresAt) < new Date()) {
      await db.updateApprovalRequest(approvalId, { status: 'EXPIRED' });
      return res.status(400).json({ status: 'FAILED', reason: 'Approval request expired' });
    }

    const paymentRecord = await db.getPaymentById(approval.paymentRecordId);
    if (!paymentRecord || paymentRecord.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ status: 'FAILED', reason: 'Associated payment record is not in PENDING_APPROVAL state' });
    }

    // Re-fetch 402 requirements
    const fetchRes = await fetch(approval.resourceUrl);
    if (fetchRes.status !== 402) {
      await db.updateApprovalRequest(approvalId, { status: 'CANCELLED', resolutionReason: 'Resource no longer requires payment' });
      return res.status(400).json({ status: 'FAILED', reason: 'Resource no longer requires payment' });
    }

    const requirement = readPaymentRequired(fetchRes);
    if (!requirement) {
      await db.updateApprovalRequest(approvalId, { status: 'CANCELLED', resolutionReason: 'Could not parse payment requirement' });
      return res.status(400).json({ status: 'FAILED', reason: 'Could not parse new payment requirements' });
    }

    // Verify conditions are unchanged
    if (
      requirement.rawAmount !== approval.amount ||
      requirement.asset !== approval.asset ||
      requirement.network !== approval.network
    ) {
      await db.updateApprovalRequest(approvalId, { status: 'CANCELLED', resolutionReason: 'Payment requirements changed' });
      return res.status(400).json({ status: 'FAILED', reason: 'Payment requirements changed since approval request was created' });
    }

    // Re-evaluate policy to ensure they haven't spent their daily limit elsewhere
    const decision = await policyEngine.evaluate(requirement, mockPolicy);
    // Note: since the policy says requireApprovalAbove=5000, it WILL return REQUIRES_APPROVAL.
    // That is fine, because the user explicitly APPROVED it this time.
    if (decision.decision === 'DENIED') {
      await db.updateApprovalRequest(approvalId, { status: 'REJECTED', resolutionReason: 'Policy Engine Denied at execution time' });
      return res.status(400).json({ status: 'FAILED', reason: 'Policy Engine Denied at execution time' });
    }

    // Atomic update
    const updated = await prisma.approvalRequest.updateMany({
      where: { id: approvalId, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        resolvedBy: 'user'
      }
    });

    if (updated.count === 0) {
      return res.status(409).json({ status: 'FAILED', reason: 'Race condition: Approval request no longer pending' });
    }

    // Call Signing Service
    // We override decision to APPROVED so SigningService permits it
    const paidResponse = await signingService.executeAuthorizedPayment(approval.resourceUrl, {}, { decision: 'APPROVED', reason: 'User explicitly approved' });
    
    if (!paidResponse.ok) {
      await db.updateStatus(paymentRecord.id, { status: 'FAILED' });
      return res.status(500).json({ status: 'PAYMENT_FAILED', reason: `Execution failed with HTTP ${paidResponse.status}` });
    }

    const paymentIdentifier = paidResponse.headers.get('payment-identifier') || paidResponse.headers.get('x-payment-identifier');
    
    await db.updateStatus(paymentRecord.id, { status: 'SUCCESS', transactionId: paymentIdentifier || undefined });

    res.json({
      status: 'SUCCESS',
      transactionId: paymentIdentifier || 'unknown',
      amount: approval.amount.toString()
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
