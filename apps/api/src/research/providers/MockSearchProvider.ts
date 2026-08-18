import { WebSearchProvider, SearchOptions, SearchResult } from '../types.js';

export class MockSearchProvider implements WebSearchProvider {
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return [
      {
        title: `Mock Result for: ${query}`,
        url: 'https://example.com/mock-result',
        snippet: 'This is a deterministic mock search result used for automated testing.',
        source: 'MockSearch',
        relevanceScore: 0.99
      },
      {
        title: `Another Mock Result`,
        url: 'https://example.com/mock-result-2',
        snippet: 'More deterministic mock content.',
        source: 'MockSearch',
        relevanceScore: 0.85
      }
    ].slice(0, options?.limit || 5);
  }
}
