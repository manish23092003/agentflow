import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { prisma } from '../db/prisma.js';
import { SigningService } from '../security/SigningService.js';

// Mock the node-fetch globally
const originalFetch = global.fetch;

beforeEach(() => {
  // Clear the DB before each test
  return prisma.approvalRequest.deleteMany().then(() => prisma.paymentRecord.deleteMany());
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Approvals API', () => {
  const db = new PrismaPaymentRepository();
  
  async function createPendingApproval(overrides = {}) {
    const p = await db.createPayment({
      resource: 'http://test',
      amount: 100,
      asset: '10458941',
      receiver: 'payTo1',
      network: 'testnet',
      decision: 'REQUIRES_APPROVAL',
      status: 'PENDING_APPROVAL',
      agentAction: 'test'
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
      payTo: 'payTo1',
      reason: 'test reason',
      expiresAt: expiresAt.toISOString(),
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
    global.fetch = vi.fn().mockResolvedValue({
      status: 402,
      ok: false,
      headers: new Headers({
        'payment-required': b64
      })
    } as unknown as Response);
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
    // Simulate current 402 returning 200 instead of 100
    mockFetchWithRequirement('200', '10458941', 'testnet', 'payTo1');
    
    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`);
    expect(res.status).toBe(400);
    expect(res.body.reason).toContain('Payment requirements changed');
    
    const updated = await db.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('CANCELLED');
  });

  it('executes payment on successful approval', async () => {
    const approval = await createPendingApproval();
    mockFetchWithRequirement('100', '10458941', 'testnet', 'payTo1');

    // Mock the signing service
    vi.spyOn(SigningService.prototype, 'executeAuthorizedPayment').mockResolvedValue({
      ok: true,
      text: async () => 'data',
      headers: new Headers({ 'x-payment-identifier': 'tx-e2e' })
    } as unknown as Response);
    
    const res = await request(app).post(`/api/v1/agent/approve/${approval.id}`);
    if (res.status !== 200) {
      console.log('Approve failed:', res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.transactionId).toBe('tx-e2e');

    const updated = await db.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('APPROVED');
    
    const payment = await db.getPaymentById(approval.paymentRecordId);
    expect(payment?.status).toBe('SUCCESS');
  });
  it('prevents race conditions with simultaneous approvals', async () => {
    const approval = await createPendingApproval();
    mockFetchWithRequirement('100', '10458941', 'testnet', 'payTo1');

    vi.spyOn(SigningService.prototype, 'executeAuthorizedPayment').mockResolvedValue({
      ok: true,
      text: async () => 'data',
      headers: new Headers({ 'x-payment-identifier': 'tx-race' })
    } as unknown as Response);

    // Fire two approval requests simultaneously
    const req1 = request(app).post(`/api/v1/agent/approve/${approval.id}`);
    const req2 = request(app).post(`/api/v1/agent/approve/${approval.id}`);
    
    const [res1, res2] = await Promise.all([req1, req2]);
    
    // One should succeed, one should fail with 409 (already resolved/conflict)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);
    
    // Ensure SigningService was only called ONCE
    expect(SigningService.prototype.executeAuthorizedPayment).toHaveBeenCalledTimes(1);
  });
});
