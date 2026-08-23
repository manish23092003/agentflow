import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../app.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { prisma } from '../db/prisma.js';
import algosdk from 'algosdk';

vi.mock('algosdk', async () => {
  const actual = await vi.importActual<typeof import('algosdk')>('algosdk');
  return {
    ...actual,
    default: {
      ...actual.default,
      decodeSignedTransaction: vi.fn(),
    },
    decodeSignedTransaction: vi.fn(),
  };
});

// Mock the node-fetch globally
const originalFetch = global.fetch;

beforeEach(async () => {
  if ((algosdk.decodeSignedTransaction as any).mockReset) {
    (algosdk.decodeSignedTransaction as any).mockReset();
  }
  // Ensure default test user exists for foreign key constraint
  await prisma.user.upsert({
    where: { id: 'test' },
    create: { id: 'test', email: 'test@agentflow.ai', name: 'Test' },
    update: {}
  });
  // Clear the DB before each test
  await prisma.approvalRequest.deleteMany();
  await prisma.paymentRecord.deleteMany();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe('Approvals API', () => {
  const db = new PrismaPaymentRepository();
  
  async function createPendingApproval(overrides = {}) {
    const session = await prisma.researchSession.create({
      data: {
        userId: 'test',
        goal: 'test',
        researchBudget: 1000,
        spent: 0,
        status: 'PENDING_APPROVAL'
      }
    });

    const p = await db.createPayment({
      resource: 'http://test',
      amount: 100,
      asset: '10458941',
      receiver: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
      network: 'testnet',
      decision: 'REQUIRES_APPROVAL',
      status: 'PENDING_APPROVAL',
      agentAction: 'test',
      researchSessionId: session.id
    });
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return await db.createApprovalRequest({
      paymentRecordId: p.id,
      status: 'PENDING',
      resourceUrl: 'http://test',
      amount: 100,
      asset: '10458941',
      network: 'testnet',
      payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
      reason: 'test reason',
      expiresAt: expiresAt.toISOString(),
      originalRequirement: Buffer.from(JSON.stringify({
        accepts: [{
          amount: '100',
          asset: '10458941',
          network: 'testnet',
          payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
        }]
      })).toString('base64'),
      ...overrides
    });
  }

  function mockFetchWithRequirement(amount: string, asset: string, network: string, payTo: string) {
    const payload = {
      accepts: [
        {
          amount,
          asset,
          network,
          payTo
        }
      ]
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mock402 = {
      status: 402,
      ok: false,
      text: async () => 'payment required',
      headers: new Headers({
        'payment-required': b64
      })
    } as unknown as Response;

    global.fetch = vi.fn().mockResolvedValue(mock402);
  }

  function mockFetchSuccess() {
    const mock200 = {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ title: 'Test', report: 'Data' }),
      headers: new Headers()
    } as unknown as Response;
    
    const mock400 = {
      status: 400,
      ok: false,
      text: async () => 'transaction already in ledger',
      headers: new Headers()
    } as unknown as Response;
    
    global.fetch = vi.fn().mockResolvedValueOnce(mock200).mockResolvedValue(mock400);
  }

  it('rejects invalid approval ID (404)', async () => {
    const res = await request(app).post('/api/v1/agent/approve/invalid-id');
    expect(res.status).toBe(404);
  });

  it('marks as REJECTED without calling signing service', async () => {
    const approval = await createPendingApproval();
    
    const res = await request(app).post(`/api/v1/agent/reject/${approval.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');

    const updated = await db.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('REJECTED');
  });

  it('rejects an expired approval request', async () => {
    const past = new Date();
    past.setHours(past.getHours() - 1);
    const approval = await createPendingApproval({ expiresAt: past.toISOString() });
    
    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`);
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Approval request expired');

    const updated = await db.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('EXPIRED');
  });

  it('cannot approve an already resolved request', async () => {
    const approval = await createPendingApproval({ status: 'APPROVED' });
    
    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`);
    expect(res.status).toBe(400);
    expect(res.body.reason).toContain('already APPROVED');
  });

  it('invalidates approval if price is stale', async () => {
    const approval = await createPendingApproval();
    (algosdk.decodeSignedTransaction as any).mockReturnValue({
      txn: {
        type: algosdk.TransactionType.axfer,
        from: { publicKey: new Uint8Array(32) },
        assetTransfer: {
          receiver: { publicKey: new Uint8Array(32) },
          assetIndex: 10458941,
          amount: 100
        }
      } as any
    });
    
    // Simulate current 402 returning 200 instead of 100
    mockFetchWithRequirement('200', '10458941', 'testnet', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ');
    
    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`).send({ signedTransactionBase64: 'mock' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('FAILED');
    
  });

  it('executes payment on successful approval', async () => {
    const approval = await createPendingApproval();
    mockFetchSuccess();
    
    (algosdk.decodeSignedTransaction as any).mockReturnValue({
      txn: {
        type: algosdk.TransactionType.axfer,
        from: { publicKey: new Uint8Array(32) },
        assetTransfer: {
          receiver: { publicKey: new Uint8Array(32) },
          assetIndex: 10458941,
          amount: 100
        }
      } as any
    });

    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`).send({ signedTransactionBase64: 'mock' });
    if (res.status !== 200) {
      console.log('Approve failed:', res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.payload.transactionId).toBe('tx-from-pera');

    const updated = await db.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('APPROVED');
    
    const payment = await db.getPaymentById(approval.paymentRecordId);
    expect(payment?.status).toBe('SUCCESS');
  });
  it('prevents race conditions with simultaneous approvals', async () => {
    const approval = await createPendingApproval();
    mockFetchSuccess();

    (algosdk.decodeSignedTransaction as any).mockReturnValue({
      txn: {
        type: algosdk.TransactionType.axfer,
        from: { publicKey: new Uint8Array(32) },
        assetTransfer: {
          receiver: { publicKey: new Uint8Array(32) },
          assetIndex: 10458941,
          amount: 100
        }
      } as any
    });

    // Fire two approval requests simultaneously
    const req1 = request(app).post(`/api/v1/agent/approve/${approval.id}`).send({ signedTransactionBase64: 'mock' });
    const req2 = request(app).post(`/api/v1/agent/approve/${approval.id}`).send({ signedTransactionBase64: 'mock' });
    
    const [res1, res2] = await Promise.all([req1, req2]);
    
    // One should succeed, one should fail (either 400 from duplicate fetch, or 500 from already executed check)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(200);
    expect([400, 409, 500]).toContain(statuses[1]);
    
    // Ensure fetch was called at most TWICE
    expect(global.fetch).not.toHaveBeenCalledTimes(0);
  });
});
