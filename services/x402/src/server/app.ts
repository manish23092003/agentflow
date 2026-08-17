import { Hono } from 'hono';
import type { RuntimeConfig } from './config.js';
import { createX402Middleware } from './config.js';
import { randomUUID } from 'node:crypto';

export function createApp(config: RuntimeConfig) {
  const app = new Hono<{ Variables: { requestId: string } }>();

  // Basic request ID and logging middleware (Safe metadata only)
  app.use('*', async (c, next) => {
    const requestId = c.req.header('x-request-id') || randomUUID();
    c.set('requestId', requestId);
    console.log(`[REQ] ${requestId} ${c.req.method} ${c.req.url}`);
    if (c.req.header('authorization')) {
      console.log(`[AUTH] ${requestId} received Authorization payload.`);
    }
    await next();
    console.log(`[RES] ${requestId} ${c.req.method} ${c.req.url} -> ${c.res.status}`);
  });

  app.get('/health', c => c.json({ status: 'ok', service: 'agentflow-x402' }));

  // Apply x402 middleware
  app.use(createX402Middleware(config));

  // Protected resource endpoint
  app.get('/research/insight', async (c) => {
    // Only reached if x402 middleware verifies payment
    const topic = c.req.query('topic') || 'general';
    return c.json({
      topic,
      insight: 'AgentFlow TestNet paid resource successfully unlocked.',
      paymentVerified: true,
      network: 'algorand-testnet'
    });
  });

  app.notFound(c => c.json({ error: 'not_found', message: 'Route not found.' }, 404));
  
  app.onError((error, c) => {
    const reqId = c.get('requestId') || 'unknown';
    console.error(`[ERR] ${reqId} Error in x402 server:`, error);
    
    const message = error.message.toLowerCase();
    if (
      message.includes('facilitator') ||
      message.includes('payment') ||
      message.includes('settle') ||
      message.includes('verify') ||
      message.includes('fetch')
    ) {
      return c.json(
        {
          error: 'payment_service_unavailable',
          message: 'x402 payment processing is unavailable.',
          requestId: reqId
        },
        503,
      );
    }
    return c.json({ 
      error: 'internal_error', 
      message: 'The paid resource could not complete the request.',
      requestId: reqId
    }, 500);
  });

  return app;
}
