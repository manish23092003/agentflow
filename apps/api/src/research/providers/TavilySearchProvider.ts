import { WebSearchProvider, SearchOptions, SearchResult } from '../types.js';
import { config } from '../../config.js';

export class TavilySearchProvider implements WebSearchProvider {
  private readonly baseUrl = 'https://api.tavily.com/search';

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    console.log(`[TavilySearchProvider] search() called with query: "${query}"`);
    if (!config.tavilyApiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    try {
      console.log('[TavilySearchProvider] Fetching from API...');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.tavilyApiKey}`
        },
        body: JSON.stringify({
          query,
          search_depth: options?.searchDepth || 'basic',
          max_results: options?.limit || 5,
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await response.json() as any;
      
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        source: 'Tavily',
        relevanceScore: r.score
      }));
    } catch (error) {
      throw new Error(`Tavily search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
