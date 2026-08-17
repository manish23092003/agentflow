import type { PaymentRequiredSummary } from '@agentflow/x402-client';
import type { PaymentRepository, PaymentRecord } from '../db/PaymentHistory.js';
import type { PolicyDecision, UserSpendingPolicy } from './types.js';

export class PolicyEngine {
  constructor(private readonly db: PaymentRepository) {}

  async evaluate(
    requirement: PaymentRequiredSummary,
    policy: UserSpendingPolicy
  ): Promise<PolicyDecision> {
    const amount = requirement.rawAmount;

    // Check Network
    if (!policy.allowedNetworks.includes(requirement.network)) {
      return { decision: 'DENIED', reason: `Network ${requirement.network} is not allowed by policy` };
    }

    // Check Asset
    const assetId = Number(requirement.asset);
    if (!policy.allowedAssets.includes(assetId)) {
      return { decision: 'DENIED', reason: `Asset ${requirement.asset} is not allowed by policy` };
    }

    // Check Max Per Transaction
    if (amount > policy.maxPerTransaction) {
      return { decision: 'DENIED', reason: `Amount ${amount} exceeds max per transaction limit of ${policy.maxPerTransaction}` };
    }

    // Check Daily Limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payments = await this.db.getPayments();
    
    const dailySpent = payments
      .filter((p: PaymentRecord) => p.status === 'SUCCESS' && new Date(p.timestamp) >= today && p.asset === requirement.asset)
      .reduce((sum: number, p: PaymentRecord) => sum + p.amount, 0);

    if (dailySpent + amount > policy.dailyLimit) {
      return { decision: 'DENIED', reason: `Transaction would exceed daily limit of ${policy.dailyLimit}` };
    }

    // Check Approval Required
    if (amount > policy.requireApprovalAbove) {
      return { decision: 'REQUIRES_APPROVAL', reason: `Amount ${amount} requires manual approval` };
    }

    return { decision: 'APPROVED', reason: 'Within transaction and daily limits' };
  }
}
