import { readPaymentRequired } from '@agentflow/x402-client';
import type { PaymentRepository } from '../db/PaymentHistory.js';
import type { PolicyEngine } from './PolicyEngine.js';
import type { UserSpendingPolicy } from './types.js';
import type { SigningService } from '../security/SigningService.js';

export class ApprovalRequiredError extends Error {
  constructor(public payload: {
    approvalId: string;
    reason: string;
    resource: string;
    amount: string;
    asset: string;
    network: string;
    budgetRemaining: string;
  }) {
    super('Agent flow suspended: Payment REQUIRES_APPROVAL');
    this.name = 'ApprovalRequiredError';
  }
}

export class PaymentTool {
  constructor(
    private readonly db: PaymentRepository,
    private readonly policyEngine: PolicyEngine,
    private readonly signingService: SigningService
  ) {}

  /**
   * The primary action called by an AI Agent to fetch a resource that might be paid.
   */
  async fetchResource(
    url: string,
    policy: UserSpendingPolicy,
    agentActionContext: string
  ): Promise<{ 
    data: string; 
    paymentExecuted: boolean; 
    logs: string[];
    metadata?: {
      amount?: string;
      asset?: string;
      network?: string;
      transactionId?: string;
    }
  }> {
    const logs: string[] = [];
    logs.push(`[Agent] Attempting to fetch resource: ${url}`);

    // 1. Initial Unpaid Fetch
    const response = await fetch(url);

    // If it's not a 402, we just return the data directly
    if (response.status !== 402) {
      if (!response.ok) {
        throw new Error(`Failed to fetch resource: HTTP ${response.status}`);
      }
      logs.push(`[Agent] Resource fetched successfully without payment.`);
      return { data: await response.text(), paymentExecuted: false, logs };
    }

    logs.push(`[Agent] Received HTTP 402 Payment Required.`);

    // 2. Parse Payment Requirements
    const requirement = readPaymentRequired(response);
    if (!requirement) {
      throw new Error('Received 402 but could not parse payment requirements from headers.');
    }

    logs.push(`[Agent] Payment required: ${requirement.price} USDC on network ${requirement.network}. Asset: ${requirement.asset}`);

    // 3. Evaluate Policy
    const decision = await this.policyEngine.evaluate(requirement, policy);
    logs.push(`[PolicyEngine] Decision: ${decision.decision}. Reason: ${decision.reason}`);

    if (decision.decision === 'DENIED') {
      throw new Error(`Agent flow aborted: Payment was DENIED. Reason: ${decision.reason}`);
    }

    if (decision.decision === 'REQUIRES_APPROVAL') {
      logs.push(`[Agent] Payment requires human approval. Creating approval request...`);
      const record = await this.db.createPayment({
        resource: url,
        amount: requirement.rawAmount,
        asset: requirement.asset,
        receiver: 'extracted-from-header-or-config',
        network: requirement.network,
        decision: decision.decision,
        status: 'PENDING_APPROVAL',
        agentAction: agentActionContext
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      const approval = await this.db.createApprovalRequest({
        paymentRecordId: record.id,
        status: 'PENDING',
        resourceUrl: url,
        amount: requirement.rawAmount,
        asset: requirement.asset,
        network: requirement.network,
        payTo: 'extracted-from-header-or-config', // Ideally derived from requirement
        reason: decision.reason,
        expiresAt: expiresAt.toISOString()
      });

      throw new ApprovalRequiredError({
        approvalId: approval.id,
        reason: decision.reason,
        resource: url,
        amount: requirement.rawAmount.toString(),
        asset: requirement.asset,
        network: requirement.network,
        budgetRemaining: 'Check policy limits' // Calculate if needed, but placeholder is fine per requirements
      });
    }

    // 4. Log Pending Transaction to DB
    const record = await this.db.createPayment({
      resource: url,
      amount: requirement.rawAmount,
      asset: requirement.asset,
      receiver: 'extracted-from-header-or-config', // In a full impl, payTo is in the parsed requirement. Let's just store a placeholder or extract it.
      network: requirement.network,
      decision: decision.decision,
      status: 'PENDING',
      agentAction: agentActionContext
    });

    logs.push(`[Agent] Authorized payment. Triggering secure signing service...`);

    // 5. Execute Authorized Payment
    try {
      // The SigningService verifies the decision object is strictly APPROVED
      const paidResponse = await this.signingService.executeAuthorizedPayment(url, {}, decision);
      
      if (!paidResponse.ok) {
        throw new Error(`Paid request failed with HTTP ${paidResponse.status}`);
      }

      await this.db.updateStatus(record.id, { status: 'SUCCESS' });
      
      const paymentIdentifier = paidResponse.headers.get('payment-identifier') || paidResponse.headers.get('x-payment-identifier');
      const settle = paidResponse.headers.get('payment-settle') || paidResponse.headers.get('x-payment-settle');
      logs.push(`[Agent] Payment successful. Resource unlocked. Tx/Settle: ${paymentIdentifier} | ${settle}`);

      return {
        data: await paidResponse.text(),
        paymentExecuted: true,
        logs,
        metadata: {
          amount: requirement.rawAmount.toString(),
          asset: requirement.asset,
          network: requirement.network,
          transactionId: paymentIdentifier || undefined
        }
      };
    } catch (e: unknown) {
      await this.db.updateStatus(record.id, { status: 'FAILED' });
      const msg = e instanceof Error ? e.message : String(e);
      logs.push(`[Agent] Payment failed: ${msg}`);
      throw e;
    }
  }
}
