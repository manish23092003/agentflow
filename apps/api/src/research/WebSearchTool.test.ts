/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSearchTool } from './tools/WebSearchTool.js';
import { MockSearchProvider } from './providers/MockSearchProvider.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';

describe('WebSearchTool', () => {
  let mockProvider: MockSearchProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRepo: any;
  let tool: WebSearchTool;

  beforeEach(() => {
    mockProvider = new MockSearchProvider();
    mockRepo = {
      getSession: vi.fn(),
      addCitation: vi.fn().mockResolvedValue({})
    };
    tool = new WebSearchTool(mockProvider, mockRepo as unknown as ResearchRepository);
  });

  it('should reject execution if session does not exist', async () => {
    mockRepo.getSession.mockResolvedValue(null);
    const def = tool.getDefinition('invalid-id');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await def.execute!({ query: 'test query' }, {} as any);
    expect(response).toEqual({ error: 'Research session not found' });
  });

  it('should return error if tool is not allowed in current state', async () => {
    mockRepo.getSession.mockResolvedValue({ id: 'session-123', status: ResearchState.SYNTHESIZING });
    const def = tool.getDefinition('session-123');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await def.execute!({ query: 'test query' }, {} as any);
    expect(response).toEqual({ error: 'WebSearchTool is not allowed in state: SYNTHESIZING. You must synthesize findings.' });
  });

  it('should persist citations on successful search', async () => {
    mockRepo.getSession.mockResolvedValue({ id: '1', status: ResearchState.RESEARCHING_FREE });
    const def = tool.getDefinition('1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await def.execute!({ query: 'test query' }, {} as any);

    expect((result as any).error).toBeUndefined();
    expect((result as any).results!).toHaveLength(2);
    expect((result as any).results![0].title).toBe('Mock Result for: test query');

    expect(mockRepo.addCitation).toHaveBeenCalledTimes(2);
    expect(mockRepo.addCitation).toHaveBeenCalledWith(expect.objectContaining({
      researchSessionId: '1',
      url: 'https://example.com/mock-result',
      sourceType: 'WEB_SEARCH',
      provider: 'MockSearch',
      isPaid: false
    }));
  });
});
