import { readPaymentRequired } from '@agentflow/x402-client';
import type { PaymentRepository } from '../db/PaymentHistory.js';
import type { PolicyEngine } from './PolicyEngine.js';
import type { UserSpendingPolicy } from './types.js';
import type { SigningService } from '../security/SigningService.js';

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
  ): Promise<{ data: string; paymentExecuted: boolean; logs: string[] }> {
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

    if (decision.decision !== 'APPROVED') {
      throw new Error(`Agent flow aborted: Payment was ${decision.decision}. Reason: ${decision.reason}`);
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
        logs
      };
    } catch (e: unknown) {
      await this.db.updateStatus(record.id, { status: 'FAILED' });
      const msg = e instanceof Error ? e.message : String(e);
      logs.push(`[Agent] Payment failed: ${msg}`);
      throw e;
    }
  }
}
