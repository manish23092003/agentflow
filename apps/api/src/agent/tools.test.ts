/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { createPaymentLLMTool } from './tools.js';
import type { PaymentTool } from './PaymentTool.js';
import type { UserSpendingPolicy } from './types.js';

describe('Payment LLM Tool', () => {
  const dummyPolicy: UserSpendingPolicy = {
    maxPerTransaction: 100,
    dailyLimit: 1000,
    allowedAssets: [],
    allowedNetworks: [],
    requireApprovalAbove: 50
  };

  it('returns SUCCESS with metadata on successful payment', async () => {
    const mockPaymentExecutor = {
      fetchResource: vi.fn().mockResolvedValue({
        data: 'secret data',
        paymentExecuted: true,
        logs: [],
        metadata: {
          amount: '100',
          asset: '123',
          network: 'testnet',
          transactionId: 'tx-123'
        }
      })
    } as unknown as PaymentTool;

    const tool = createPaymentLLMTool(mockPaymentExecutor, dummyPolicy);
    
    // Test the execute function directly
    const result = await tool.execute({ url: 'http://test', context: 'test' }, { toolCallId: '1', messages: [] } as any) as { status: string; data: string; amount: string; transactionId: string };
    
    expect((result as any).status).toBe('SUCCESS');
    expect(result.data).toBe('secret data');
    expect(result.amount).toBe('100');
    expect(result.transactionId).toBe('tx-123');
  });

  it('returns DENIED when policy engine denies payment', async () => {
    const mockPaymentExecutor = {
      fetchResource: vi.fn().mockRejectedValue(new Error('Agent flow aborted: Payment was DENIED. Reason: test'))
    } as unknown as PaymentTool;

    const tool = createPaymentLLMTool(mockPaymentExecutor, dummyPolicy);
    const result = await tool.execute({ url: 'http://test', context: 'test' }, { toolCallId: '1', messages: [] } as any);
    
    expect((result as any).status).toBe('DENIED');
  });

  it('returns PAYMENT_FAILED when payment execution fails', async () => {
    const mockPaymentExecutor = {
      fetchResource: vi.fn().mockRejectedValue(new Error('Payment failed: execution error'))
    } as unknown as PaymentTool;

    const tool = createPaymentLLMTool(mockPaymentExecutor, dummyPolicy);
    const result = await tool.execute({ url: 'http://test', context: 'test' }, { toolCallId: '1', messages: [] } as any);
    
    expect((result as any).status).toBe('PAYMENT_FAILED');
  });

  it('returns RESOURCE_FAILED for generic fetch errors', async () => {
    const mockPaymentExecutor = {
      fetchResource: vi.fn().mockRejectedValue(new Error('Failed to fetch resource: HTTP 404'))
    } as unknown as PaymentTool;

    const tool = createPaymentLLMTool(mockPaymentExecutor, dummyPolicy);
    const result = await tool.execute({ url: 'http://test', context: 'test' }, { toolCallId: '1', messages: [] } as any);
    
    expect((result as any).status).toBe('RESOURCE_FAILED');
  });
});
