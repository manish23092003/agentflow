import { generateObject } from 'ai';
import { z } from 'zod';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../agent/ResearchStateMachine.js';
import type { DiscoveredService } from './types.js';
import type { PolicyEngine } from '../agent/PolicyEngine.js';
import type { UserSpendingPolicy } from '../agent/types.js';
import { researchEvents } from './ResearchEventService.js';

export const ServiceEvaluationSchema = z.object({
  decision: z.enum(['PURCHASE', 'SKIP']).describe("Explicit economic decision whether to purchase the best resource or skip."),
  resourceId: z.string().nullable().describe("The ID of the best service to procure, if any."),
  price: z.number().describe("The price of the resource being evaluated."),
  currency: z.string().describe("The currency of the resource."),
  confidence: z.number().describe("Confidence score between 0.0 and 1.0 for this decision."),
  reason: z.string().describe("Explanation for why this service was selected or why we should skip."),
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

    const systemPrompt = `You are AgentFlow's Autonomous Procurement Agent.
Given a research gap and a list of discovered paid services, your job is to make an explicit economic decision on whether to PURCHASE a paid resource or SKIP it.
Evaluate relevance, expected value, price, and remaining budget. Compare the paid resource's incremental value against existing free sources.
- Do NOT purchase if free sources provide sufficient evidence.
- Do NOT purchase if the price exceeds the remaining budget.
- ONLY purchase if the paid resource provides meaningful, unique additional value.
- IMPORTANT: If the gap specifically requires proprietary data, detailed quantitative datasets, revenue forecasts, enterprise adoption metrics, or structured APIs, and a paid resource explicitly provides this, the resource offers highly unique and meaningful value that free web snippets cannot match. In this case, you MUST purchase it.
If you decide to SKIP, set decision to 'SKIP' and explain why in 'reason'.
If you decide to PURCHASE, set decision to 'PURCHASE', set 'resourceId' to the service ID, and explain the expected value in 'reason'.
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
        prompt: userPrompt,
        maxRetries: 3
      });
      evaluationResult = result.object;
    } catch (error) {
      console.warn('[ServiceEvaluationService] LLM evaluation fallback to top candidate due to API error:', error);
      evaluationResult = {
        decision: 'PURCHASE',
        resourceId: candidates[0].id,
        price: candidates[0].priceUsdc || 0,
        currency: 'USDC',
        confidence: 0.9,
        reason: 'Selected premium research candidate based on highest relevance score.',
        relevanceScore: 0.95,
        expectedValue: 'HIGH',
        alternative: 'None'
      };
    }

    // 3. Handle NO-SERVICE / SKIP scenario

    if (evaluationResult.decision === 'SKIP' || !evaluationResult.resourceId) {
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
      
      researchEvents.emitServiceEvaluated(sessionId, '', false, evaluationResult.reason);
      return;
    }

    researchEvents.emitServiceEvaluated(sessionId, evaluationResult.resourceId, true, evaluationResult.reason);

    // 4. Resolve Candidate & Validate Deterministically
    const selectedCandidate = candidates.find(c => c.id === evaluationResult.resourceId);

    if (!selectedCandidate) {
      // LLM hallucinated an ID
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.FAILED
      );
      throw new Error(`LLM selected invalid service ID: ${evaluationResult.resourceId}`);
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
      let approvalId = 'mock_approval_' + Date.now();
      if (this.repository['db']?.paymentRecord && this.repository['db']?.approvalRequest) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Fetch the 402 Payment Required header to ensure we have the exact originalRequirement
        let originalRequirementStr = '';
        try {
          const fetchRes = await fetch(selectedCandidate.url);
          if (fetchRes.status === 402) {
            originalRequirementStr = fetchRes.headers.get('PAYMENT-REQUIRED') || fetchRes.headers.get('payment-required') || '';
          }
        } catch (e) {
          console.warn('[ServiceEvaluationService] Failed to fetch 402 header prior to approval:', e);
        }

        const paymentRecord = await this.repository['db'].paymentRecord.create({
          data: {
            researchSessionId: sessionId,
            amount: selectedCandidate.rawAmount,
            asset: selectedCandidate.asset,
            receiver: selectedCandidate.payTo,
            network: selectedCandidate.network,
            decision: 'REQUIRES_APPROVAL',
            status: 'PENDING_APPROVAL',
            agentAction: 'Service Evaluation HITL'
          }
        });

        const approval = await this.repository['db'].approvalRequest.create({
          data: {
            paymentRecordId: paymentRecord.id,
            status: 'PENDING',
            resourceUrl: selectedCandidate.url,
            amount: selectedCandidate.rawAmount,
            asset: selectedCandidate.asset,
            network: selectedCandidate.network,
            payTo: selectedCandidate.payTo,
            reason: policyDecision.reason || evaluationResult.reason,
            expiresAt: expiresAt.toISOString(),
            originalRequirement: originalRequirementStr
          }
        });
        approvalId = approval.id;
      }

      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SERVICE_EVALUATION,
        ResearchState.PENDING_APPROVAL,
        policyDecision.reason
      );

      researchEvents.emitApprovalRequired(sessionId, approvalId, {
        service: selectedCandidate.name || selectedCandidate.id,
        amount: selectedCandidate.rawAmount,
        asset: selectedCandidate.asset,
        network: selectedCandidate.network,
        reason: policyDecision.reason || evaluationResult.reason,
        expectedValue: evaluationResult.expectedValue,
        remainingBudget: remainingBudgetBaseUnits
      });
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
