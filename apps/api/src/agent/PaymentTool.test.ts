import { describe, it, expect, vi } from 'vitest';
import { PaymentTool } from './PaymentTool.js';
import type { PaymentRepository } from '../db/PaymentHistory.js';
import type { PolicyEngine } from './PolicyEngine.js';
import type { SigningService } from '../security/SigningService.js';
import type { PolicyDecision } from './types.js';

describe('PaymentTool', () => {
  const mockDb: PaymentRepository = {
    createPayment: vi.fn().mockResolvedValue({ id: '123' }),
    getPayments: vi.fn(),
    updateStatus: vi.fn()
  };

  const mockPolicyEngine = {
    evaluate: vi.fn()
  } as unknown as PolicyEngine;

  const mockSigningService = {
    executeAuthorizedPayment: vi.fn()
  } as unknown as SigningService;

  const tool = new PaymentTool(mockDb, mockPolicyEngine, mockSigningService);

  const dummyPolicy = {
    maxPerTransaction: 100,
    dailyLimit: 1000,
    allowedAssets: [],
    allowedNetworks: [],
    requireApprovalAbove: 50
  };

  it('blocks denied payment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 402,
      headers: new Headers({
        'payment-required': Buffer.from(JSON.stringify({
          accepts: [{ amount: '10000', network: 'testnet', asset: '123' }]
        })).toString('base64url')
      })
    });

    vi.mocked(mockPolicyEngine.evaluate).mockResolvedValue({
      decision: 'DENIED',
      reason: 'test'
    });

    await expect(tool.fetchResource('http://test', dummyPolicy, 'test'))
      .rejects.toThrow(/Payment was DENIED/);
    
    expect(mockSigningService.executeAuthorizedPayment).not.toHaveBeenCalled();
  });
  
  it('executes approved payment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 402,
      headers: new Headers({
        'payment-required': Buffer.from(JSON.stringify({
          accepts: [{ amount: '10000', network: 'testnet', asset: '123' }]
        })).toString('base64url')
      })
    });

    const approvedDecision: PolicyDecision = { decision: 'APPROVED', reason: 'ok' };
    vi.mocked(mockPolicyEngine.evaluate).mockResolvedValue(approvedDecision);
    vi.mocked(mockSigningService.executeAuthorizedPayment).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'secret data',
      headers: {
        get: vi.fn().mockReturnValue('mock-id')
      }
    } as unknown as Response);

    const res = await tool.fetchResource('http://test', dummyPolicy, 'test');
    
    expect(res.paymentExecuted).toBe(true);
    expect(res.data).toBe('secret data');
    expect(mockSigningService.executeAuthorizedPayment).toHaveBeenCalledWith('http://test', {}, approvedDecision);
    expect(mockDb.updateStatus).toHaveBeenCalledWith('123', { status: 'SUCCESS' });
  });
});
