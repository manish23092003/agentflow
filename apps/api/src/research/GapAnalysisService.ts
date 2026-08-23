import { generateObject } from 'ai';
import { z } from 'zod';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../agent/ResearchStateMachine.js';
import { parseLlmError } from '../agent/errors.js';
import { researchEvents } from './ResearchEventService.js';

export const GapAnalysisSchema = z.object({
  hasMaterialGap: z.boolean().describe("True if the user's research goal explicitly requests machine-readable data, structured API data, quantitative datasets, proprietary intelligence, or granular forecasts that are not provided as authoritative structured data by the free snippets."),
  missingInformation: z.array(z.string()).describe("List of missing structured API data fields, quantitative datasets, granular forecasts, or proprietary intelligence."),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe("Importance of the missing info."),
  evidenceSummary: z.string().describe("A brief summary of what current evidence supports."),
  recommendedAction: z.enum(['CONTINUE_FREE', 'DISCOVER_PAID']).describe("Next action recommendation. Set to DISCOVER_PAID if budget is available and explicit requirements (such as machine-readable data, structured API responses, proprietary intelligence, or quantitative datasets) are not fully satisfied by free public sources."),
  evidenceCitationIds: z.array(z.string()).describe("List of citation IDs that support the summary.")
});

export type GapAnalysisResult = z.infer<typeof GapAnalysisSchema>;

export class GapAnalysisService {
  constructor(private repository: ResearchRepository) {}

  async evaluateGaps(sessionId: string): Promise<void> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== ResearchState.EVALUATING_GAPS) {
      throw new Error(`Invalid state transition: Cannot execute gap analysis in state ${session.status}`);
    }

    const citations = await this.repository.getCitationsBySessionId(sessionId);

    if (citations.length === 0) {
      // Safe failure: No evidence available
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.EVALUATING_GAPS,
        ResearchState.FAILED
      );
      throw new Error('NO_EVIDENCE_FOR_GAP_ANALYSIS');
    }

    const citationText = citations.map(c => `[ID: ${c.id}] Title: ${c.title || 'N/A'}\nSnippet: ${c.snippet || 'N/A'}`).join('\n\n');

    const systemPrompt = `You are a rigorous, objective research gap analyzer for AgentFlow.
Your objective is to determine if the collected free public web search results leave a MATERIAL GAP compared to the user's explicit research goal.

EVALUATION CRITERIA:
1. Identify if the user's goal requires advanced, premium, or structured information that typical free web articles lack. Examples include:
   - Proprietary data or analyst intelligence
   - Detailed market forecasts (e.g., revenue forecasts, market share by region)
   - Enterprise adoption metrics or sponsor-level data
   - Quantitative datasets (historical + forecast datasets)
   - Deep industry reports or paid research reports
   - Structured machine-readable API payloads (like weather data streams)
2. If the user's goal falls into one of these categories (e.g., requests detailed market sizing, quantitative projections, or proprietary intelligence):
   - Evaluate whether the free search snippets actually provide this exact data, or if they only provide general summaries, SEO articles, or secondary commentary.
   - If the free sources lack the specific quantitative or proprietary details requested, then a material gap exists.
   - Set hasMaterialGap = true, importance = "HIGH", recommendedAction = "DISCOVER_PAID", and clearly list the missing premium details in missingInformation.
3. If the user's goal is a general informational lookup (e.g., "What are AI agents?") OR if the free sources actually contain sufficient data to fully answer the request, then set hasMaterialGap = false.`;

    const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
    const model = llmProvider.getModel();

    try {
      const result = await generateObject({
        model,
        schema: GapAnalysisSchema,
        system: systemPrompt,
        maxRetries: 3,
        messages: [
          {
            role: 'user',
            content: `User Research Goal: "${session.goal}"
Budget Allocated: ${session.researchBudget > 0 ? `${(session.researchBudget / 1000000).toFixed(2)} USDC available for premium research` : 'None'}

Evidence Citations Collected so Far:
${citationText}

Evaluate whether the collected free public search snippets fully satisfy all explicit requirements in "${session.goal}".
Specifically verify:
1. Does the evidence provide the actual requested quantitative datasets, forecasts, market intelligence, or API payloads, or merely general third-party text excerpts?
2. If the goal requires specific numbers, datasets, structured data, or proprietary intelligence, is that fully present in the free search results?
If explicit data, forecast, or proprietary intelligence requirements remain unmet by free sources, report hasMaterialGap: true, importance: "HIGH", and recommendedAction: "DISCOVER_PAID".`
          }
        ]
      });

      const gap = result.object;

      // Validate that the LLM didn't invent citation IDs
      const validCitationIds = new Set(citations.map(c => c.id));
      const invalidIds = gap.evidenceCitationIds.filter(id => !validCitationIds.has(id));
      
      if (invalidIds.length > 0) {
        throw new Error(`LLM returned invalid citation IDs: ${invalidIds.join(', ')}`);
      }

      // Persist the Gap result
      await this.repository.createGap({
        researchSessionId: sessionId,
        hasMaterialGap: gap.hasMaterialGap,
        missingInformation: JSON.stringify(gap.missingInformation),
        importance: gap.importance,
        evidenceSummary: gap.evidenceSummary,
        recommendedAction: gap.recommendedAction,
        evidenceCitationIds: JSON.stringify(gap.evidenceCitationIds)
      });
      
      console.log('--- TEMPORARY RESEARCH DIAGNOSTICS: GAP ANALYSIS ---');
      console.log('Session ID:', sessionId);
      console.log('Goal:', session.goal);
      console.log('gapAnalysis.materialGap:', gap.hasMaterialGap);
      console.log('gapAnalysis.importance:', gap.importance);
      console.log('gapAnalysis.recommendedAction:', gap.recommendedAction);
      console.log('gapAnalysis.missingInformation:', gap.missingInformation);
      console.log('gapAnalysis.evidenceSummary:', gap.evidenceSummary);
      console.log('----------------------------------------------------');

      researchEvents.emitAgentAction(sessionId, 'GAP_ANALYSIS_COMPLETED', `Material gap: ${gap.hasMaterialGap}. Next: ${gap.recommendedAction}`);

      // App logic dictates state transition
      let nextState: ResearchState;

      if (!gap.hasMaterialGap) {
        nextState = ResearchState.SYNTHESIZING;
      } else if (gap.importance === 'MEDIUM' || gap.importance === 'HIGH') {
        nextState = ResearchState.PAID_DISCOVERY;
      } else {
        // hasMaterialGap = true, but importance = LOW -> Synthesize
        nextState = ResearchState.SYNTHESIZING;
      }

      await ResearchStateMachine.transition(this.repository, sessionId, ResearchState.EVALUATING_GAPS, nextState);

    } catch (error) {
      const llmError = parseLlmError(error);
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.EVALUATING_GAPS,
        ResearchState.FAILED,
        llmError.message
      );
      researchEvents.emitResearchFailed(sessionId, llmError.message);
      throw llmError;
    }
  }
}
