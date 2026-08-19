import { generateObject } from 'ai';
import { z } from 'zod';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../agent/ResearchStateMachine.js';
import type { DiscoveredService } from './types.js';
import type { PolicyEngine } from '../agent/PolicyEngine.js';
import type { UserSpendingPolicy } from '../agent/types.js';

export const ServiceEvaluationSchema = z.object({
  selectedServiceId: z.string().nullable().describe("The ID of the best service to procure, or null if none are eligible/worthwhile."),
  reason: z.string().describe("Explanation for why this service was selected or why none were selected."),
  relevanceScore: z.number().describe("A score between 0.0 and 1.0 indicating how relevant the service is to the gap."),
  expectedValue: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe("The expected value this service adds toward resolving the gap."),
  alternative: z.string().optional().describe("A cheaper or alternative approach if applicable.")
});

export type ServiceEvaluationResult = z.infer<typeof ServiceEvaluationSchema>;

export class ServiceEvaluationService {
  constructor(
    private repository: ResearchRepository,
    private policyEngine: PolicyEngine
  ) {}

  async evaluateServices(
    sessionId: string,
    gap: { missingInformation: string[], importance: string },
    candidates: DiscoveredService[],
    policy: UserSpendingPolicy
  ): Promise<void> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== ResearchState.SERVICE_EVALUATION) {
      throw new Error(`Service evaluation is not allowed in state: ${session.status}`);
    }

    const remainingBudgetBaseUnits = session.researchBudget - session.spent;

    // 1. Check if we have any candidates
    if (!candidates || candidates.length === 0) {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.SYNTHESIZING,
        'No eligible candidates discovered.'
      );
      return;
    }

    // 2. Call LLM to evaluate candidates
    const provider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
    const model = provider.getModel();
    
    // Scrub payment metadata to prevent LLM from hallucinating values
    const safeCandidates = candidates.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      priceUsdc: c.priceUsdc, // For display/ranking only
      capabilities: c.capabilities
    }));

    const systemPrompt = `You are AgentFlow's Service Evaluator.
Given a research gap and a list of discovered paid services, your job is to select the single best service that addresses the gap, if one exists and is worth the cost.
Evaluate relevance, expected value, and price.
If no service is highly relevant or worth the price, return selectedServiceId as null.
DO NOT invent service IDs. Only use the IDs provided.`;

    const userPrompt = `
Gap Importance: ${gap.importance}
Missing Information:
${JSON.stringify(gap.missingInformation, null, 2)}

Remaining Budget (base units): ${remainingBudgetBaseUnits}

Candidate Services:
${JSON.stringify(safeCandidates, null, 2)}
`;

    let evaluationResult: ServiceEvaluationResult;

    try {
      const result = await generateObject({
        model,
        schema: ServiceEvaluationSchema,
        system: systemPrompt,
        prompt: userPrompt
      });
      evaluationResult = result.object;
    } catch (error) {
      console.error('[ServiceEvaluationService] LLM evaluation failed:', error);
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.FAILED
      );
      throw error;
    }

    // 3. Handle NO-SERVICE scenario
    if (!evaluationResult.selectedServiceId) {
      // Record a recommendation with NO_ELIGIBLE_SERVICE status
      await this.repository.createRecommendation({
        researchSessionId: sessionId,
        service: 'None',
        serviceUrl: '',
        price: 0,
        asset: '',
        network: '',
        reason: evaluationResult.reason,
        relevanceScore: evaluationResult.relevanceScore || 0,
        expectedValue: 'LOW',
        alternative: evaluationResult.alternative || '',
        status: 'NO_ELIGIBLE_SERVICE'
      });

      // Transition to SYNTHESIZING
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.SYNTHESIZING
      );
      return;
    }

    // 4. Resolve Candidate & Validate Deterministically
    const selectedCandidate = candidates.find(c => c.id === evaluationResult.selectedServiceId);

    if (!selectedCandidate) {
      // LLM hallucinated an ID
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.FAILED
      );
      throw new Error(`LLM selected invalid service ID: ${evaluationResult.selectedServiceId}`);
    }

    // Validate remaining budget
    if (selectedCandidate.rawAmount > remainingBudgetBaseUnits) {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.ALTERNATIVE_DISCOVERY
      );
      throw new Error(`Selected service exceeds budget. Candidate cost: ${selectedCandidate.rawAmount}, Remaining: ${remainingBudgetBaseUnits}`);
    }

    // Validate URL
    if (!selectedCandidate.url) {
       await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.FAILED
      );
      throw new Error(`Selected service is missing resource URL.`);
    }

    // Validate Asset & Network (Basic presence check, PolicyEngine does the thorough check against policy)
    if (!selectedCandidate.asset || !selectedCandidate.network || !selectedCandidate.paymentScheme) {
       await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.FAILED
      );
      throw new Error(`Selected service is missing required payment metadata.`);
    }

    // 5. Call PolicyEngine with EXACT candidate metadata
    const paymentSummary = {
      rawAmount: selectedCandidate.rawAmount,
      network: selectedCandidate.network,
      asset: selectedCandidate.asset,
      paymentScheme: selectedCandidate.paymentScheme,
      paymentUrl: selectedCandidate.url,
      price: selectedCandidate.priceUsdc ? selectedCandidate.priceUsdc.toString() : '0',
      description: selectedCandidate.description
    };

    const policyDecision = await this.policyEngine.evaluate(paymentSummary, policy);

    // 6. Persist Recommendation using Trusted Metadata
    let dbStatus = 'PENDING';
    if (policyDecision.decision === 'APPROVED') dbStatus = 'SELECTED';
    if (policyDecision.decision === 'DENIED') dbStatus = 'REJECTED';

    await this.repository.createRecommendation({
      researchSessionId: sessionId,
      service: selectedCandidate.name || selectedCandidate.id,
      serviceUrl: selectedCandidate.url,
      price: selectedCandidate.rawAmount, // IMPORTANT: Base Units
      asset: selectedCandidate.asset,
      network: selectedCandidate.network,
      reason: evaluationResult.reason,
      relevanceScore: evaluationResult.relevanceScore,
      expectedValue: evaluationResult.expectedValue,
      alternative: evaluationResult.alternative || '',
      status: dbStatus
    });

    // 7. Transition State based on Policy
    if (policyDecision.decision === 'APPROVED') {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.PAYMENT_AUTHORIZED
      );
    } else if (policyDecision.decision === 'REQUIRES_APPROVAL') {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.PENDING_APPROVAL,
        policyDecision.reason
      );
    } else {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.ALTERNATIVE_DISCOVERY
      );
      throw new Error(`Policy Engine DENIED: ${policyDecision.reason}`);
    }
  }
}
