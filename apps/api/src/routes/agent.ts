import { Router } from 'express';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { SigningService } from '../security/SigningService.js';
import { PaymentTool } from '../agent/PaymentTool.js';
import { MockAgent } from '../agent/MockAgent.js';
import { LlmAgent } from '../agent/LlmAgent.js';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { UserSpendingPolicy } from '../agent/types.js';

const router = Router();

// In a real app, these would be instantiated globally via DI container.
const db = new PrismaPaymentRepository();
const policyEngine = new PolicyEngine(db);
const signingService = new SigningService();
const paymentTool = new PaymentTool(db, policyEngine, signingService);

// Legacy Mock Agent
const mockAgent = new MockAgent(paymentTool);

// New LLM Agent
const geminiProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
const llmAgent = new LlmAgent(geminiProvider, paymentTool);

router.post('/procure', async (req, res) => {
  const { prompt, policy } = req.body as { prompt?: string; policy?: UserSpendingPolicy };

  if (!prompt || !policy) {
    return res.status(400).json({ error: 'Missing prompt or policy' });
  }

  try {
    const { result, logs } = await mockAgent.runTask(prompt, policy);
    return res.json({ result, logs });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: errorMsg });
  }
});

router.post('/chat', async (req, res) => {
  const { task, policy, sessionId } = req.body as { task?: string; policy?: UserSpendingPolicy; sessionId?: string };

  if (!task || !policy) {
    return res.status(400).json({ error: 'Missing task or policy' });
  }

  try {
    const response = await llmAgent.chat(task, policy, sessionId);
    return res.json(response);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: errorMsg });
  }
});

export default router;
