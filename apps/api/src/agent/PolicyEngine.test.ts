import { describe, it, expect, vi } from 'vitest';
import { PolicyEngine } from './PolicyEngine.js';
import type { PaymentRepository } from '../db/PaymentHistory.js';
import type { UserSpendingPolicy } from './types.js';
import type { PaymentRequiredSummary } from '@agentflow/x402-client';

describe('PolicyEngine', () => {
  const mockDb: PaymentRepository = {
    createPayment: vi.fn(),
    getPayments: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn()
  };

  const engine = new PolicyEngine(mockDb);

  const basePolicy: UserSpendingPolicy = {
    maxPerTransaction: 100000,
    dailyLimit: 500000,
    allowedAssets: [10458941],
    allowedNetworks: ['algorand-testnet', 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='],
    requireApprovalAbove: 50000
  };

  const baseReq: PaymentRequiredSummary = {
    price: '$0.01',
    rawAmount: 10000,
    asset: '10458941',
    network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
    description: 'test'
  };

  it('approves valid payment', async () => {
    const result = await engine.evaluate(baseReq, basePolicy);
    expect(result.decision).toBe('APPROVED');
  });

  it('rejects expensive payment', async () => {
    const req = { ...baseReq, rawAmount: 200000 };
    const result = await engine.evaluate(req, basePolicy);
    expect(result.decision).toBe('DENIED');
    expect(result.reason).toContain('exceeds max per transaction');
  });

  it('rejects wrong network', async () => {
    const req = { ...baseReq, network: 'ethereum' };
    const result = await engine.evaluate(req, basePolicy);
    expect(result.decision).toBe('DENIED');
    expect(result.reason).toContain('not allowed');
  });

  it('rejects unsupported asset', async () => {
    const req = { ...baseReq, asset: '99999' };
    const result = await engine.evaluate(req, basePolicy);
    expect(result.decision).toBe('DENIED');
    expect(result.reason).toContain('not allowed');
  });

  it('requires approval above threshold', async () => {
    const req = { ...baseReq, rawAmount: 60000 };
    const result = await engine.evaluate(req, basePolicy);
    expect(result.decision).toBe('REQUIRES_APPROVAL');
  });
});
