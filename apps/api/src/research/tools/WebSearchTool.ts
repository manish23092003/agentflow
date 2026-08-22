import { z } from 'zod';
import { createCompatibleTool } from '../../agent/ai-sdk-adapter.js';
import type { WebSearchProvider } from '../types.js';
import type { ResearchRepository } from '../../db/ResearchRepository.js';
import { ResearchStateMachine, ResearchState } from '../../agent/ResearchStateMachine.js';
import { researchEvents } from '../ResearchEventService.js';

export class WebSearchTool {
  constructor(
    private provider: WebSearchProvider,
    private repository: ResearchRepository
  ) {}

  public getDefinition(researchSessionId: string) {
    return createCompatibleTool({
      description: 'Search the web for free information and news. Prioritize this tool before recommending paid services.',
      parameters: z.object({
        query: z.string().optional().describe('The search query to look up'),
        topic: z.string().optional().describe('The topic to search for'),
        searchQuery: z.string().optional().describe('The search query')
      }),
      execute: async (rawArgs: { query?: string; topic?: string; searchQuery?: string }) => {
        const session = await this.repository.getSession(researchSessionId);
        if (!session) {
          console.error('[WebSearchTool] session not found');
          return { error: 'Research session not found' };
        }

        const query = (rawArgs?.query && rawArgs.query !== 'undefined' ? rawArgs.query : null) ||
                      (rawArgs?.topic && rawArgs.topic !== 'undefined' ? rawArgs.topic : null) ||
                      (rawArgs?.searchQuery && rawArgs.searchQuery !== 'undefined' ? rawArgs.searchQuery : null) ||
                      session.goal;

        console.log(`[WebSearchTool] execute() called with query: "${query}"`);

        if (!ResearchStateMachine.isToolAllowed(session.status as ResearchState, 'WebSearchTool')) {
          console.error(`[WebSearchTool] not allowed in state: ${session.status}`);
          return { error: `WebSearchTool is not allowed in state: ${session.status}. You must synthesize findings.` };
        }

        try {
          console.log(`[WebSearchTool] calling provider.search("${query}")...`);
          const results = await this.provider.search(query);
          console.log(`[WebSearchTool] provider returned ${results.length} results`);

          // Persist citations
          for (const res of results) {
            const citation = await this.repository.addCitation({
              researchSessionId,
              url: res.url,
              title: res.title,
              snippet: res.snippet,
              sourceType: 'WEB_SEARCH',
              provider: res.source || 'Unknown',
              relevanceScore: res.relevanceScore,
              isPaid: false,
              cost: 0
            });
            researchEvents.emitCitationAdded(researchSessionId, { id: citation.id, url: citation.url, title: citation.title || undefined });
          }

          console.log('[WebSearchTool] citations persisted');
          return { results };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Web search failed' };
        }
      }
    });
  }
}
