import { ResearchAgent } from './ResearchAgent.js';
import { GapAnalysisService } from '../research/GapAnalysisService.js';
import { ServiceEvaluationService } from '../research/ServiceEvaluationService.js';
import { SynthesisService } from '../research/SynthesisService.js';
import { ProcurementService } from '../research/ProcurementService.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchState, ResearchStateMachine } from './ResearchStateMachine.js';
import { createServiceDiscoveryTool } from '../research/tools/ServiceDiscoveryTool.js';
import { BazaarServiceDiscoveryProvider } from '../research/providers/BazaarServiceDiscoveryProvider.js';
import type { ServiceDiscoveryProvider } from '../research/types.js';
import type { UserSpendingPolicy } from './types.js';
import { researchEvents } from '../research/ResearchEventService.js';
import { generateText } from 'ai';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import { parseLlmError } from './errors.js';

export class ResearchOrchestrator {
  private discoveryProvider: ServiceDiscoveryProvider;

  constructor(
    private repository: ResearchRepository,
    private researchAgent: ResearchAgent,
    private gapAnalysisService: GapAnalysisService,
    private serviceEvaluationService: ServiceEvaluationService,
    private synthesisService: SynthesisService,
    private procurementService: ProcurementService,
    private mockPolicy: UserSpendingPolicy,
    discoveryProvider?: ServiceDiscoveryProvider
  ) {
    this.discoveryProvider = discoveryProvider || new BazaarServiceDiscoveryProvider();
  }

  public async run(sessionId: string): Promise<void> {
    try {
      while (true) {
        const session = await this.repository.getSession(sessionId);
        if (!session) {
          console.error(`Orchestrator stopping: session ${sessionId} not found`);
          return;
        }

        const state = session.status as ResearchState;

        // Terminal or paused states
        if (
          state === ResearchState.COMPLETED ||
          state === ResearchState.FAILED ||
          state === ResearchState.PENDING_APPROVAL ||
          state === ResearchState.USER_REJECTED
        ) {
          console.log(`[Orchestrator] Halting at terminal/paused state: ${state}`);
          return;
        }

        switch (state) {
          case ResearchState.CREATED:
            await this.repository.updateStatus(sessionId, ResearchState.RESEARCHING_FREE);
            researchEvents.emitSessionState(sessionId, ResearchState.RESEARCHING_FREE);
            break;

          case ResearchState.RESEARCHING_FREE:
            console.log(`[Orchestrator] Executing FREE_RESEARCH`);
            await this.researchAgent.runFreeResearchPhase(sessionId);
            break;

          case ResearchState.FREE_RESEARCH_COMPLETE:
            console.log(`[Orchestrator] Transitioning to EVALUATING_GAPS`);
            await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.FREE_RESEARCH_COMPLETE, ResearchState.EVALUATING_GAPS);
            break;

          case ResearchState.EVALUATING_GAPS:
            console.log(`[Orchestrator] Executing GAP_ANALYSIS`);
            await this.gapAnalysisService.evaluateGaps(sessionId);
            break;

          case ResearchState.PAID_DISCOVERY:
            console.log(`[Orchestrator] Executing PAID_DISCOVERY`);
            await this.runPaidDiscovery(sessionId);
            break;

          case ResearchState.SERVICE_EVALUATION:
            console.log(`[Orchestrator] Executing SERVICE_EVALUATION`);
            // ServiceEvaluationService expects candidates. We retrieve them from DB.
            // Wait, we need to get the gaps and candidates!
            await this.runServiceEvaluation(sessionId);
            break;
            
          case ResearchState.PAYMENT_AUTHORIZED:
            console.log(`[Orchestrator] Executing PAYMENT_AUTHORIZED`);
            await this.runProcurement(sessionId);
            break;

          case ResearchState.RESOURCE_ACQUIRED:
            console.log(`[Orchestrator] Transitioning to SYNTHESIZING`);
            await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.RESOURCE_ACQUIRED, ResearchState.SYNTHESIZING);
            break;

          case ResearchState.SYNTHESIZING:
            console.log(`[Orchestrator] Executing SYNTHESIS`);
            await this.synthesisService.synthesize(sessionId);
            break;
            
          case ResearchState.ALTERNATIVE_DISCOVERY:
            console.log(`[Orchestrator] Falling back to SYNTHESIZING from ALTERNATIVE_DISCOVERY`);
            await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.ALTERNATIVE_DISCOVERY, ResearchState.SYNTHESIZING);
            break;

          default:
            console.error(`[Orchestrator] Unknown state: ${state}`);
            return;
        }
      }
    } catch (error: unknown) {
      console.error(`[Orchestrator] Fatal error:`, error);
      // Ensure we mark it failed if it's not already
      const current = await this.repository.getSession(sessionId);
      if (current && current.status !== ResearchState.FAILED) {
        const llmError = parseLlmError(error);
        await this.repository.updateStatus(sessionId, ResearchState.FAILED, llmError.message);
        researchEvents.emitSessionState(sessionId, ResearchState.FAILED);
        researchEvents.emitResearchFailed(sessionId, llmError.message);
      }
    }
  }

  private async runPaidDiscovery(sessionId: string) {
    const session = await this.repository.getSession(sessionId);
    if (!session) return;
    
    const gaps = await this.repository['db'].researchGap.findMany({ where: { researchSessionId: sessionId }, orderBy: { createdAt: 'desc' } });
    if (!gaps.length) {
      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.PAID_DISCOVERY, ResearchState.SYNTHESIZING);
      return;
    }
    
    const latestGap = gaps[0];
    const missingInfo = JSON.parse(latestGap.missingInformation) as string[];
    const query = missingInfo.join(', ');

    researchEvents.emitAgentAction(sessionId, 'PAID_DISCOVERY_STARTED', `Searching for paid sources regarding: ${query}`);

    const tool = createServiceDiscoveryTool(session, this.discoveryProvider);
    
    const systemPrompt = `You are a service discovery agent. Your goal is to find paid sources for the missing information: "${query}".
Call the ServiceDiscoveryTool.`;

    const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
    const model = llmProvider.getModel();
    
    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Find paid services now.' }],
        tools: { serviceDiscoveryTool: tool },
        toolChoice: 'required',
        maxRetries: 0,
      });
      
      const calls = result.toolCalls || [];
      if (!calls.length) {
         await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.PAID_DISCOVERY, ResearchState.SYNTHESIZING);
         return;
      }
      
      // Look at tool results
      const toolResults = result.toolResults || [];
      for (const res of toolResults as Record<string, unknown>[]) {
        if (res.result && Array.isArray((res.result as Record<string, unknown>).services) && ((res.result as Record<string, unknown>).services as unknown[]).length > 0) {
          // Store candidates temporarily or pass them directly if possible.
        }
      }
      
      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.PAID_DISCOVERY, ResearchState.SERVICE_EVALUATION);
    } catch(e) {
      console.warn('[Orchestrator] Paid discovery fallback executing tool directly:', e);
      if (typeof tool.execute === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tool.execute as any)({ topic: query });
      }
      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.PAID_DISCOVERY, ResearchState.SERVICE_EVALUATION);
    }
  }

  private async runServiceEvaluation(sessionId: string) {
    const gaps = await this.repository['db'].researchGap.findMany({ where: { researchSessionId: sessionId }, orderBy: { createdAt: 'desc' } });
    if (!gaps.length) {
      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.SERVICE_EVALUATION, ResearchState.SYNTHESIZING);
      return;
    }
    
    const session = await this.repository.getSession(sessionId);
    const remainingBudget = session ? session.researchBudget - session.spent : undefined;

    const latestGap = gaps[0];
    const missingInfo = JSON.parse(latestGap.missingInformation) as string[];
    
    const candidates = await this.discoveryProvider.discover(missingInfo.join(' '), {
      allowedNetworks: this.mockPolicy.allowedNetworks,
      allowedAssets: this.mockPolicy.allowedAssets?.map(String),
      maxPriceBaseUnits: remainingBudget
    });
    
    await this.serviceEvaluationService.evaluateServices(sessionId, {
      importance: latestGap.importance,
      missingInformation: missingInfo
    }, candidates, this.mockPolicy);
  }

  private async runProcurement(sessionId: string) {
    // Find the pending/approved recommendation
    const recommendation = await this.repository['db'].paidResourceRecommendation.findFirst({
      where: { researchSessionId: sessionId, status: 'SELECTED' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!recommendation) {
      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.PAYMENT_AUTHORIZED, ResearchState.SYNTHESIZING);
      return;
    }

    await this.procurementService.executeProcurement(sessionId, recommendation.id, this.mockPolicy, false);
  }
}
