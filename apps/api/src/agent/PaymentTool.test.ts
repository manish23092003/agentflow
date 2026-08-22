import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentTool } from './PaymentTool.js';
import type { PolicyDecision } from './types.js';

describe('PaymentTool', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPolicyEngine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSigningService: any;
  let tool: PaymentTool;

  beforeEach(() => {
    mockDb = {
      createPayment: vi.fn().mockResolvedValue({ id: '123' }),
      getPayments: vi.fn(),
      getPaymentById: vi.fn(),
      updateStatus: vi.fn(),
      createApprovalRequest: vi.fn(),
      getApprovalRequest: vi.fn(),
      updateApprovalRequest: vi.fn(),
    };
    mockPolicyEngine = {
      evaluate: vi.fn()
    };
    mockSigningService = {
      executeAuthorizedPayment: vi.fn()
    };
    tool = new PaymentTool(
      mockDb as import('../db/PaymentHistory.js').PaymentRepository,
      mockPolicyEngine as import('./PolicyEngine.js').PolicyEngine,
      mockSigningService as import('../security/SigningService.js').SigningService
    );
  });

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
    expect(mockDb.updateStatus).toHaveBeenCalledWith('123', { status: 'SUCCESS', transactionId: 'mock-id' });
  });
});
