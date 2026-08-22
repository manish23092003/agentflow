import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';
const EXACT_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=' as `${string}:${string}`;

// Mock config for tests
const mockConfig = {
  network: EXACT_TESTNET_CAIP2,
  networkName: 'testnet',
  payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ',
  price: '0.10',
  usdcAssetId: '10458941',
  facilitatorUrl: 'https://facilitator.goplausible.xyz/',
  port: 3002,
};

describe('AgentFlow x402 Server', () => {
  const app = createApp(mockConfig);

  it('should return health status', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ status: 'ok', service: 'agentflow-x402' });
  });

  it('should reject unauthorized requests to protected endpoints with 402', { timeout: 15000 }, async () => {
    const res = await app.request('/research/insight');
    expect(res.status).toBe(402);
    
    // Check for x402 headers
    const paymentRequired = res.headers.get('payment-required');
    expect(paymentRequired).toBeTruthy();
    
    const decoded = JSON.parse(Buffer.from(paymentRequired!, 'base64url').toString('utf8'));
    expect(decoded.accepts).toBeDefined();
    expect(decoded.accepts.length).toBeGreaterThan(0);
    
    const req = decoded.accepts[0];
    expect(req.network).toBe(EXACT_TESTNET_CAIP2);
    expect(req.extra.asset).toBe(10458941);
  });

  it('should return 402 for /research/premium with exact 0.10 USDC (100000 base units) requirement', { timeout: 15000 }, async () => {
    const res = await app.request('/research/premium');
    expect(res.status).toBe(402);

    const paymentRequired = res.headers.get('payment-required');
    expect(paymentRequired).toBeTruthy();

    const decoded = JSON.parse(Buffer.from(paymentRequired!, 'base64url').toString('utf8'));
    expect(decoded.accepts).toBeDefined();
    expect(decoded.accepts.length).toBeGreaterThan(0);

    const req = decoded.accepts[0];
    expect(req.scheme).toBe('exact');
    expect(req.amount).toBe('100000');
    expect(req.asset).toBe('10458941');
    expect(req.network).toBe(EXACT_TESTNET_CAIP2);
    expect(req.payTo).toBe(mockConfig.payTo);
    expect(req.extra.asset).toBe(10458941);
  });

  it('should reject requests with invalid authorization header', { timeout: 15000 }, async () => {
    const res = await app.request('/research/premium', {
      headers: {
        authorization: 'Bearer invalid-token'
      }
    });
    expect(res.status).toBe(402);
  });

  it('should include request IDs in errors', async () => {
    // Force a 404
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe('not_found');
  });
});
