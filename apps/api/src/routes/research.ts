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
import { GapAnalysisService } from '../research/GapAnalysisService.js';
import { ServiceEvaluationService } from '../research/ServiceEvaluationService.js';
import { SynthesisService } from '../research/SynthesisService.js';
import { ResearchOrchestrator } from '../agent/ResearchOrchestrator.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
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
const gapAnalysisService = new GapAnalysisService(repository);
const serviceEvaluationService = new ServiceEvaluationService(repository, policyEngine);
const synthesisService = new SynthesisService(repository);

const mockPolicy: UserSpendingPolicy = {
  maxPerTransaction: 100000000, 
  dailyLimit: 1000000000,
  allowedAssets: [10458941],
  allowedNetworks: ['testnet', 'algorand-testnet', 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='],
  requireApprovalAbove: 0 // Require approval for ALL paid resources
};

const orchestrator = new ResearchOrchestrator(
  repository,
  researchAgent,
  gapAnalysisService,
  serviceEvaluationService,
  synthesisService,
  procurementService,
  mockPolicy
);

const StartResearchSchema = z.object({
  goal: z.string(),
  budget: z.number().int().min(0), // USDC base units
  walletAddress: z.string().min(58).max(58)
});

researchRouter.post('/start', requireAuth, async (req, res) => {
  try {
    const data = StartResearchSchema.parse(req.body);
    const userId = req.user!.id;
    
    // Create the session scoped to the authenticated user
    const session = await repository.createSession(
      userId,
      data.goal,
      data.budget,
      data.walletAddress
    );

    // Run the orchestrator asynchronously in the background
    orchestrator.run(session.id).catch(e => {
      console.error('Orchestrator failure:', e);
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

researchRouter.get('/', requireAuth, async (req, res) => {
  try {
    const sessions = await repository.getSessions(req.user!.id);
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const session = await repository.getSession(id, req.user!.id);
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

researchRouter.get('/:id/citations', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const citations = await repository['db'].citation.findMany({
      where: { researchSessionId: id },
      orderBy: { retrievedAt: 'desc' }
    });
    res.json(citations);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id/payments', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const allPayments = await paymentRepo.getPayments(req.user!.id);
    const payments = allPayments.filter(p => p.researchSessionId === id);
    res.json(payments);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

researchRouter.get('/:id/stream', optionalAuth, async (req, res) => {
  const sessionId = req.params.id as string;

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

researchRouter.post('/:id/procure', requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { recommendationId } = ProcureSchema.parse(req.body);
    const result = await procurementService.executeProcurement(
      id,
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
