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

    const citationMap = new Map<string, number>();
    citations.forEach((c, index) => citationMap.set(c.id, index + 1));

    const citationText = citations.map(c => 
      `SOURCE [${citationMap.get(c.id)}]:\nTitle: ${c.title || 'N/A'}\nURL: ${c.url || 'N/A'}\nProvider: ${c.provider}\nSnippet: ${c.snippet || 'N/A'}`
    ).join('\n\n');


    const systemPrompt = `You are a professional research analyst.
Your job is to synthesize all gathered evidence into a comprehensive, polished research report.
The report must answer the user's research goal directly and clearly.

Format your report using this strict structure:
# Research Report Title
## Executive Summary
## 1. Global Market Size & Revenue Forecast
## 2. Enterprise Adoption
## 3. Regional Market Analysis
## 4. Industry / Sector Analysis
## 5. Key Growth Drivers
## 6. Risks / Limitations
## 7. Key Takeaways

Formatting Rules:
- Use Markdown tables where useful (e.g. for Market Size or Regional Analysis).
- Use concise bullet lists for drivers, limitations, and takeaways.
- Cite your sources using ONLY the provided numeric notation (e.g., [1], [2]).
- Never invent or fabricate numbers/percentages.
- Explicitly state when specific data (like yearly breakdowns or regional percentages) is unavailable in the provided evidence.
- NEVER output UUIDs, internal IDs, session IDs, payment IDs, approval IDs, or backend metadata.
- Do NOT include a "Sources" section at the end; it will be appended automatically.`;

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

      let sanitizedReport = result.text.trim();

      // 1. Convert any leaked UUIDs to their mapped number
      for (const [uuid, index] of citationMap.entries()) {
        const uuidRegex = new RegExp(uuid, 'gi');
        sanitizedReport = sanitizedReport.replace(uuidRegex, String(index));
      }

      // 2. Remove any remaining unknown UUIDs as a final safety net
      const unknownUuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      sanitizedReport = sanitizedReport.replace(unknownUuidRegex, '');

      // 3. Clean malformed citation artifacts
      sanitizedReport = sanitizedReport.replace(/\[\s*\]/g, ''); // empty brackets [] or [ ]
      sanitizedReport = sanitizedReport.replace(/\[\s*,\s*\]/g, ''); // [,] or [ , ]
      sanitizedReport = sanitizedReport.replace(/\[\s*,+/g, '[');
      sanitizedReport = sanitizedReport.replace(/,+\s*\]/g, ']');
      sanitizedReport = sanitizedReport.replace(/,\s*,/g, ',');

      // 4. Remove LLM generated sources section if it hallucinated one
      sanitizedReport = sanitizedReport.replace(/(?:^|\n)#{1,3}\s*Sources?[\s\S]*$/i, '');

      // 5. Build authoritative sources section
      const sourcesList = citations.map(c => `[${citationMap.get(c.id)}] ${c.title || 'N/A'}\n    ${c.url || 'No URL available'}`).join('\n\n');
      sanitizedReport = `${sanitizedReport.trim()}\n\n### Sources\n\n${sourcesList}`;

      // Persist the report using the proper repository method
      // This validates the report is non-empty before saving
      await this.repository.updateReport(sessionId, sanitizedReport);

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
