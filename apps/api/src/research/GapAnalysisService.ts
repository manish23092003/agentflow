import { generateObject } from 'ai';
import { z } from 'zod';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../agent/ResearchStateMachine.js';
import { researchEvents } from './ResearchEventService.js';

export const GapAnalysisSchema = z.object({
  hasMaterialGap: z.boolean().describe("True if critical info is missing from the evidence."),
  missingInformation: z.array(z.string()).describe("List of missing key facts."),
  importance: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe("Importance of the missing info."),
  evidenceSummary: z.string().describe("A brief summary of what current evidence supports."),
  recommendedAction: z.enum(['CONTINUE_FREE', 'DISCOVER_PAID']).describe("Next action recommendation."),
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

    const systemPrompt = `You are a strict research gap analyzer. 
Your job is to read the user's research goal and the provided evidence citations, and determine if there is a MATERIAL GAP in information.
Only cite evidence using the provided Citation IDs. Do not invent citation IDs.
A material gap means quantitative data or critical facts are missing to fully answer the goal.`;

    const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
    const model = llmProvider.getModel();

    try {
      const result = await generateObject({
        model,
        schema: GapAnalysisSchema,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Goal: "${session.goal}"\n\nEvidence Citations:\n${citationText}\n\nEvaluate the gap.` }
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
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.EVALUATING_GAPS,
        ResearchState.FAILED
      );
      throw error;
    }
  }
}
