import { readPaymentRequired, readPaymentResponse } from '@agentflow/x402-client';
import { x402Client, x402HTTPClient } from '@x402/core/client';
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
      paymentRecordId?: string;
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
    const rawHeaderBase64 = response.headers.get('PAYMENT-REQUIRED') || response.headers.get('payment-required');

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
        payTo: requirement.payTo || process.env.X402_PROVIDER_ADDRESS || 'unknown',
        reason: decision.reason,
        expiresAt: expiresAt.toISOString(),
        originalRequirement: rawHeaderBase64 || ''
      });

      throw new ApprovalRequiredError({
        approvalId: approval.id,
        reason: decision.reason,
        resource: url,
        amount: requirement.rawAmount.toString(),
        asset: requirement.asset,
        network: requirement.network,
        budgetRemaining: 'Check policy limits'
      });
    }

    // 4. Log Pending Transaction to DB
    const record = await this.db.createPayment({
      resource: url,
      amount: requirement.rawAmount,
      asset: requirement.asset,
      receiver: requirement.payTo || process.env.X402_PROVIDER_ADDRESS || 'unknown',
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
        const body = await paidResponse.text().catch(() => 'No body');
        console.error('Paid response failed body:', body);
        throw new Error(`Paid request failed with HTTP ${paidResponse.status}`);
      }

      const paymentResp = readPaymentResponse(paidResponse);
      const transactionId = paymentResp?.transactionId || paidResponse.headers.get('payment-identifier') || paidResponse.headers.get('x-payment-identifier') || undefined;
      const settle = paidResponse.headers.get('payment-settle') || paidResponse.headers.get('x-payment-settle');
      logs.push(`[Agent] Payment successful. Resource unlocked. Tx: ${transactionId} | Settle: ${settle}`);

      await this.db.updateStatus(record.id, { status: 'SUCCESS', transactionId });

      return {
        data: await paidResponse.text(),
        paymentExecuted: true,
        logs,
        metadata: {
          amount: requirement.rawAmount.toString(),
          asset: requirement.asset,
          network: requirement.network,
          transactionId,
          paymentRecordId: record.id
        }
      };
    } catch (e: unknown) {
      await this.db.updateStatus(record.id, { status: 'FAILED' });
      const msg = e instanceof Error ? e.message : String(e);
      logs.push(`[Agent] Payment failed: ${msg}`);
      throw e;
    }
  }

  async resumePaymentWithSignature(approval: import('../db/PaymentHistory.js').ApprovalRequest, signedTransactionBase64: string): Promise<string> {
    

    if (!approval.originalRequirement) {
      throw new Error('Approval request is missing the original payment requirement. Cannot construct exact PaymentPayload.');
    }

    let accepted;
    try {
      const decoded = Buffer.from(approval.originalRequirement, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.accepts && parsed.accepts.length > 0) {
        accepted = parsed.accepts[0];
      }
    } catch (e) {
      throw new Error(`Failed to parse originalRequirement: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    if (!accepted) {
      throw new Error('Failed to extract exact accepted requirement from originalRequirement.');
    }

    // Construct the x402 V2 payment payload matching the schema expected by @x402/core:
    const paymentPayload = {
      x402Version: 2 as const,
      accepted,
      payload: {
        paymentGroup: [signedTransactionBase64],
        paymentIndex: 0
      }
    };



    
    const client = new x402Client();
    const httpClient = new x402HTTPClient(client);
    const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);

    const res = await fetch(approval.resourceUrl, {
      headers
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const prHeader = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');
      
      let parsedHeader = '';
      if (prHeader) {
        try {
           parsedHeader = Buffer.from(prHeader, 'base64').toString('utf8');
        } catch {
           // ignore parsing error
        }
      }

      console.error('--- PAID RESOURCE FETCH FAILED ---');
      console.error('Status:', res.status);
      console.error('Body:', body);
      console.error('PAYMENT-REQUIRED Header decoded:', parsedHeader);
      console.error('----------------------------------');

      throw new Error(`Failed to fetch paid resource after providing signature: HTTP ${res.status} ${body} (Header: ${parsedHeader})`);
    }

    return await res.text();
  }
}
