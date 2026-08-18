// @ts-nocheck
import { tool } from 'ai';
import { z } from 'zod';
import type { PaymentTool } from './PaymentTool.js';
import { ApprovalRequiredError } from './PaymentTool.js';
import type { UserSpendingPolicy } from './types.js';

/**
 * Creates the LLM-compatible tool definition for the PaymentTool.
 * We do not execute the payment fully in Step 3, but we set up the schema.
 */
export function createPaymentLLMTool(paymentExecutor: PaymentTool, policy: UserSpendingPolicy) {
  return tool({
    description: 'Fetches a protected web resource. If the resource requires payment (HTTP 402), it will automatically evaluate your spending policy and execute the payment if approved.',
    parameters: z.object({
      url: z.string().url().describe('The URL of the protected resource to fetch'),
      context: z.string().describe('A brief explanation of why you are fetching this resource')
    }),
    execute: async ({ url, context }: { url: string; context: string }) => {
      try {
        const result = await paymentExecutor.fetchResource(url, policy, context);
        return {
          status: 'SUCCESS',
          data: result.data,
          resourceUrl: url,
          ...result.metadata
        };
      } catch (error: unknown) {
        if (error instanceof ApprovalRequiredError) {
          return {
            status: 'REQUIRES_APPROVAL',
            approvalId: error.payload.approvalId,
            reason: error.payload.reason,
            resource: error.payload.resource,
            amount: error.payload.amount,
            asset: error.payload.asset,
            network: error.payload.network,
            budgetRemaining: error.payload.budgetRemaining
          };
        }

        const msg = error instanceof Error ? error.message : String(error);
        
        let status = 'RESOURCE_FAILED';
        if (msg.includes('Agent flow aborted: Payment was DENIED') || msg.includes('Agent flow aborted: Payment was REQUIRES_APPROVAL')) {
          status = 'DENIED';
        } else if (msg.includes('Payment failed:')) {
          status = 'PAYMENT_FAILED';
        }

        return {
          status,
          error: msg
        };
      }
    }
  });
}
