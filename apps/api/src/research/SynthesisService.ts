import { generateText } from 'ai';
import { GeminiProvider } from '../llm/gemini.js';
import { config } from '../config.js';
import type { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../agent/ResearchStateMachine.js';
import { parseLlmError } from '../agent/errors.js';
import { researchEvents } from './ResearchEventService.js';

export class SynthesisService {
  constructor(private repository: ResearchRepository) {}

  async synthesize(sessionId: string): Promise<void> {
    const session = await this.repository.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== ResearchState.SYNTHESIZING) {
      throw new Error(`Invalid state transition: Cannot execute synthesis in state ${session.status}`);
    }

    const citations = await this.repository.getCitationsBySessionId(sessionId);
    
    if (citations.length === 0) {
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SYNTHESIZING,
        ResearchState.FAILED,
        'No citations found to synthesize.'
      );
      researchEvents.emitResearchFailed(sessionId, 'No citations found to synthesize.');
      throw new Error('NO_CITATIONS_FOR_SYNTHESIS');
    }

    const citationText = citations.map(c => 
      `[ID: ${c.id}] Title: ${c.title || 'N/A'}\nProvider: ${c.provider}\nSnippet: ${c.snippet || 'N/A'}`
    ).join('\n\n');

    const systemPrompt = `You are a professional research analyst.
Your job is to synthesize all gathered evidence into a comprehensive final report.
The report must answer the user's research goal directly and clearly.
Format your report in clean Markdown.
Cite your sources using [ID: <id>] notation corresponding to the provided citations.
Do not invent any facts not supported by the citations.`;

    const userPrompt = `
Research Goal: "${session.goal}"

Collected Evidence:
${citationText}

Please write the final synthesis report.
`;

    const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
    const model = llmProvider.getModel();

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxRetries: 3,
      });

      if (!result.text || result.text.trim().length === 0) {
        throw new Error('LLM returned an empty report.');
      }

      const reportText = result.text.trim();

      // Persist the report using the proper repository method
      // This validates the report is non-empty before saving
      await this.repository.updateReport(sessionId, reportText);

      // Verify the report was actually persisted before transitioning to COMPLETED
      const verifiedSession = await this.repository.getSession(sessionId);
      if (!verifiedSession?.report || verifiedSession.report.trim().length === 0) {
        throw new Error('Report persistence verification failed: report is empty after save');
      }

      // Transition to COMPLETED only after confirmed persistence
      await ResearchStateMachine.transition(
        this.repository,
        sessionId,
        ResearchState.SYNTHESIZING,
        ResearchState.COMPLETED
      );
      
      researchEvents.emitResearchCompleted(sessionId);

    } catch (error) {
      const llmError = parseLlmError(error);
      // Only transition to FAILED if not already in a terminal state
      const currentSession = await this.repository.getSession(sessionId);
      if (currentSession && currentSession.status === ResearchState.SYNTHESIZING) {
        await ResearchStateMachine.transition(
          this.repository,
          sessionId,
          ResearchState.SYNTHESIZING,
          ResearchState.FAILED,
          llmError.message
        );
        researchEvents.emitResearchFailed(sessionId, llmError.message);
      }
      throw llmError;
    }
  }
}
