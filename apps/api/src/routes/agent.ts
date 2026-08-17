import { Router } from 'express';
import { JsonPaymentRepository } from '../db/PaymentHistory.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { SigningService } from '../security/SigningService.js';
import { PaymentTool } from '../agent/PaymentTool.js';
import { MockAgent } from '../agent/MockAgent.js';
import type { UserSpendingPolicy } from '../agent/types.js';

const router = Router();

// In a real app, these would be instantiated globally via DI container.
const db = new JsonPaymentRepository();
const policyEngine = new PolicyEngine(db);
const signingService = new SigningService();
const paymentTool = new PaymentTool(db, policyEngine, signingService);
const agent = new MockAgent(paymentTool);

router.post('/procure', async (req, res) => {
  const { prompt, policy } = req.body as { prompt?: string; policy?: UserSpendingPolicy };

  if (!prompt || !policy) {
    return res.status(400).json({ error: 'Missing prompt or policy' });
  }

  try {
    const { result, logs } = await agent.runTask(prompt, policy);
    return res.json({ result, logs });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: errorMsg });
  }
});

export default router;
