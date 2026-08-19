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
