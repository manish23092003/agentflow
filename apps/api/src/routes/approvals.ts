import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { SigningService } from '../security/SigningService.js';
import type { UserSpendingPolicy } from '../agent/types.js';
import { ProcurementService } from '../research/ProcurementService.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { PaymentTool } from '../agent/PaymentTool.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import { researchEvents } from '../research/ResearchEventService.js';

const router = Router();
const db = new PrismaPaymentRepository();
const policyEngine = new PolicyEngine(db);
const signingService = new SigningService();

const researchRepo = new ResearchRepository();
const paymentTool = new PaymentTool(db, policyEngine, signingService);
const procurementService = new ProcurementService(researchRepo, db, paymentTool);

// Mock policy for phase 5 since we don't have user management yet
const mockPolicy: UserSpendingPolicy = {
  maxPerTransaction: 100000000, 
  dailyLimit: 1000000000,
  allowedAssets: [10458941], // USDC on Algorand TestNet
  allowedNetworks: ['testnet', 'algorand-testnet', 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='],
  requireApprovalAbove: 5000 // 0.005 USDC
};

router.get('/approvals', async (req: Request, res: Response) => {
  try {
    const approvals = await db.getApprovalRequests();
    
    // Enrich with session data for the frontend
    const enriched = await Promise.all(approvals.map(async (approval) => {
      const payment = await db.getPaymentById(approval.paymentRecordId);
      if (payment && payment.researchSessionId) {
        const session = await researchRepo.getSession(payment.researchSessionId);
        return {
          ...approval,
          researchSessionId: payment.researchSessionId,
          researchGoal: session?.goal || 'Unknown Goal'
        };
      }
      return approval;
    }));
    
    res.json(enriched);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

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

    // Update research session
    if (approval.paymentRecordId) {
      const paymentRecord = await db.getPaymentById(approval.paymentRecordId);
      if (paymentRecord?.researchSessionId) {
        await researchRepo.updateStatus(paymentRecord.researchSessionId, ResearchState.ALTERNATIVE_DISCOVERY);
        researchEvents.emitSessionState(paymentRecord.researchSessionId, ResearchState.ALTERNATIVE_DISCOVERY);
      }
    }

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

    await prisma.paymentRecord.update({
      where: { id: approval.paymentRecordId },
      data: { decision: 'APPROVED' }
    });

    // Resume flow via ProcurementService
    const result = await procurementService.resumeApproval(approvalId, mockPolicy);

    if (result.status !== 'SUCCESS') {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

export default router;
