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

  describe('resumePaymentWithSignature', () => {
    const rawRequirement = {
      x402Version: 2,
      error: 'Payment required',
      accepts: [{
        scheme: 'exact',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        amount: '100000',
        asset: '10458941',
        payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
        maxTimeoutSeconds: 300,
        extra: {
          asset: 10458941,
          feePayer: 'ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA'
        }
      }]
    };
    const testApproval = {
      id: 'test-approval',
      paymentRecordId: 'test-payment',
      status: 'PENDING' as const,
      resourceUrl: 'http://x402-server/resource',
      amount: 100000,
      asset: '10458941',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
      reason: 'test',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      originalRequirement: Buffer.from(JSON.stringify(rawRequirement)).toString('base64')
    };
    const testSignedTxn = 'dGVzdC1zaWduZWQtdHhuLWJhc2U2NA=='; // "test-signed-txn-base64" in base64

    it('sends the PAYMENT-SIGNATURE header', async () => {
      let capturedHeaders: Record<string, string> = {};
      global.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        const headers = opts?.headers as Record<string, string>;
        capturedHeaders = headers || {};
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'paid content'
        });
      });

      await tool.resumePaymentWithSignature(testApproval, testSignedTxn);

      expect(capturedHeaders['PAYMENT-SIGNATURE']).toBeDefined();
    });

    it('encodes payload as standard base64 without prefix', async () => {
      let capturedHeaderValue = '';
      global.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        const headers = opts?.headers as Record<string, string>;
        capturedHeaderValue = headers?.['PAYMENT-SIGNATURE'] || '';
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'paid content'
        });
      });

      await tool.resumePaymentWithSignature(testApproval, testSignedTxn);

      expect(capturedHeaderValue).not.toMatch(/^exact /);

      const decoded = JSON.parse(Buffer.from(capturedHeaderValue, 'base64').toString('utf8'));
      expect(decoded).toBeDefined();
      expect(decoded.x402Version).toBe(2);
    });

    it('includes x402Version 2 and preserves EXACT original accepted fields including extra.feePayer', async () => {
      let capturedPayload: Record<string, unknown> = {};
      global.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        const headers = opts?.headers as Record<string, string>;
        capturedPayload = JSON.parse(Buffer.from(headers['PAYMENT-SIGNATURE'], 'base64').toString('utf8'));
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'paid content'
        });
      });

      await tool.resumePaymentWithSignature(testApproval, testSignedTxn);

      expect(capturedPayload.x402Version).toBe(2);
      expect(capturedPayload.accepted).toEqual(rawRequirement.accepts[0]);
      expect((capturedPayload.accepted as Record<string, unknown>).extra).toBeDefined();
      expect(((capturedPayload.accepted as Record<string, unknown>).extra as Record<string, unknown>).feePayer).toBe('ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA');
      expect(capturedPayload.payload).toEqual({
        paymentGroup: [testSignedTxn],
        paymentIndex: 0
      });
    });

    it('throws if originalRequirement is missing', async () => {
      const invalidApproval = { ...testApproval, originalRequirement: undefined };
      
      await expect(
        tool.resumePaymentWithSignature(invalidApproval, testSignedTxn)
      ).rejects.toThrow(/missing the original payment requirement/);
    });

    it('throws on non-OK response from x402 server', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => 'Payment required',
        headers: {
          get: () => null
        }
      });

      await expect(
        tool.resumePaymentWithSignature(testApproval, testSignedTxn)
      ).rejects.toThrow(/Failed to fetch paid resource after providing signature: HTTP 402/);
    });
  });
});
