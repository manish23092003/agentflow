import { Router } from 'express';
import { z } from 'zod';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchAgent } from '../agent/ResearchAgent.js';
import { TavilySearchProvider } from '../research/providers/TavilySearchProvider.js';
import { ProcurementService } from '../research/ProcurementService.js';
import { PrismaPaymentRepository } from '../db/PaymentHistory.js';
import { PaymentTool } from '../agent/PaymentTool.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { SigningService } from '../security/SigningService.js';
import type { UserSpendingPolicy } from '../agent/types.js';
import { researchEvents } from '../research/ResearchEventService.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import crypto from 'node:crypto';

const researchRouter = Router();

const repository = new ResearchRepository();
const webSearchProvider = new TavilySearchProvider();
const researchAgent = new ResearchAgent(repository, webSearchProvider);

const paymentRepo = new PrismaPaymentRepository();
const policyEngine = new PolicyEngine(paymentRepo);
const signingService = new SigningService();
const paymentTool = new PaymentTool(paymentRepo, policyEngine, signingService);
const procurementService = new ProcurementService(repository, paymentRepo, paymentTool);

const mockPolicy: UserSpendingPolicy = {
  maxPerTransaction: 100000000, 
  dailyLimit: 1000000000,
  allowedAssets: [10458941],
  allowedNetworks: ['testnet', 'algorand-testnet', 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='],
  requireApprovalAbove: 5000
};

const StartResearchSchema = z.object({
  goal: z.string(),
  budget: z.number().int().min(0) // USDC base units
});

researchRouter.post('/start', async (req, res) => {
  try {
    const data = StartResearchSchema.parse(req.body);
    
    // Create the session
    const session = await repository.createSession(
      'default-user', // Hardcoded user for now
      data.goal,
      data.budget
    );

    // Run the agent synchronously in the background (fire and forget for this step, though in prod we'd queue it)
    // For manual testing, we just let it run async
    researchAgent.runFreeResearchPhase(session.id).catch(e => {
      console.error('Agent failure:', e);
    });

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.status(400).json({ error: (error as any).errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

researchRouter.get('/', async (req, res) => {
  try {
    const sessions = await repository.getSessions();
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id', async (req, res) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Fetch citations
    const citations = await repository['db'].citation.findMany({
      where: { researchSessionId: session.id }
    });

    res.json({
      ...session,
      remaining: session.researchBudget - session.spent,
      citations
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id/citations', async (req, res) => {
  try {
    const citations = await repository['db'].citation.findMany({
      where: { researchSessionId: req.params.id },
      orderBy: { retrievedAt: 'desc' }
    });
    res.json(citations);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id/payments', async (req, res) => {
  try {
    const allPayments = await paymentRepo.getPayments();
    const payments = allPayments.filter(p => p.researchSessionId === req.params.id);
    res.json(payments);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id/stream', async (req, res) => {
  const sessionId = req.params.id;

  try {
    const session = await repository.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Initial state push
    const initialEvent = {
      id: crypto.randomUUID(),
      sessionId,
      type: 'session_state',
      timestamp: new Date().toISOString(),
      data: { status: session.status as ResearchState }
    };
    
    // Support Last-Event-ID gracefully (currently no replay beyond initial state)
    // A robust system would load historical events from DB. 
    // For now we just push the latest state.
    res.write(`id: ${initialEvent.id}\n`);
    res.write(`event: ${initialEvent.type}\n`);
    res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

    // Keepalive ping every 15 seconds
    const keepAlive = setInterval(() => {
      res.write(':\n\n'); // SSE Comment as keep-alive
    }, 15000);

    const unsubscribe = researchEvents.subscribe(sessionId, (event) => {
      res.write(`id: ${event.id}\n`);
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

  } catch {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

const ProcureSchema = z.object({
  recommendationId: z.string()
});

researchRouter.post('/:id/procure', async (req, res) => {
  try {
    const { recommendationId } = ProcureSchema.parse(req.body);
    const result = await procurementService.executeProcurement(
      req.params.id,
      recommendationId,
      mockPolicy
    );

    res.json(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.status(400).json({ error: (error as any).errors });
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  }
});

export default researchRouter;
