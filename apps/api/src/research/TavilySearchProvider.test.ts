import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TavilySearchProvider } from './providers/TavilySearchProvider.js';
import { config } from '../config.js';

describe('TavilySearchProvider', () => {
  let provider: TavilySearchProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new TavilySearchProvider();
    config.tavilyApiKey = 'test-key';
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should throw if TAVILY_API_KEY is missing', async () => {
    config.tavilyApiKey = undefined;
    await expect(provider.search('test')).rejects.toThrow(/TAVILY_API_KEY is not configured/);
  });

  it('should return normalized results on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        results: [
          { title: 'Test', url: 'https://test.com', content: 'snippet', score: 0.9 }
        ]
      })
    });

    const results = await provider.search('test query');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      title: 'Test',
      url: 'https://test.com',
      snippet: 'snippet',
      source: 'Tavily',
      relevanceScore: 0.9
    });
  });

  it('should handle invalid response format', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    });

    const results = await provider.search('test query');
    expect(results).toHaveLength(0);
  });

  it('should handle network timeout/failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(provider.search('test')).rejects.toThrow(/Tavily search error: Network error/);
  });

  it('should handle HTTP error status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    await expect(provider.search('test')).rejects.toThrow(/Tavily search error: Tavily search failed: 500 Internal Server Error/);
  });
});
