/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { ResearchAgent } from './ResearchAgent.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { WebSearchProvider } from '../research/types.js';
import { ResearchState } from './ResearchStateMachine.js';
import { generateText } from 'ai';
import { LLMExecutionError } from './errors.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock('ai', async (importOriginal: any) => {
  return {
    ...(await importOriginal() as any),
    generateText: vi.fn(),
    tool: vi.fn((def) => def)
  };
});

describe('ResearchAgent', () => {
  let repository: Mocked<ResearchRepository>;
  let provider: Mocked<WebSearchProvider>;
  let agent: ResearchAgent;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = {
      getSession: vi.fn(),
      updateStatus: vi.fn(),
      db: {
        citation: {
          count: vi.fn()
        }
      } as any
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider = {
      search: vi.fn()
    } as any;

    agent = new ResearchAgent(repository, provider);
  });

  it('should transition to FAILED on 429 quota error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.CREATED, goal: 'test' } as any);
    
    vi.mocked(generateText).mockRejectedValue({ statusCode: 429 });

    await expect(agent.runFreeResearchPhase('1')).rejects.toThrowError(LLMExecutionError);
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should transition to FAILED on generic provider error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.CREATED, goal: 'test' } as any);
    
    vi.mocked(generateText).mockRejectedValue(new Error('Some API error'));

    await expect(agent.runFreeResearchPhase('1')).rejects.toThrowError(LLMExecutionError);
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should transition to FAILED on empty LLM response with zero tool calls', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.CREATED, goal: 'test' } as any);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(generateText).mockResolvedValue({ text: '', toolCalls: [] } as any);

    await expect(agent.runFreeResearchPhase('1')).rejects.toThrowError(LLMExecutionError);
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should transition to FAILED if zero citations are persisted', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.CREATED, goal: 'test' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (repository as any).db.citation.count.mockResolvedValue(0);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(generateText).mockResolvedValue({
      text: '',
      toolCalls: [{ type: 'tool-call', toolCallId: '1', toolName: 'webSearchTool', args: { query: 'test' } }]
    } as any);

    await expect(agent.runFreeResearchPhase('1')).rejects.toThrowError(LLMExecutionError);
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should complete successfully if citations exist', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.CREATED, goal: 'test' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (repository as any).db.citation.count.mockResolvedValue(2);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(generateText).mockResolvedValue({
      text: '',
      toolCalls: [{ type: 'tool-call', toolCallId: '1', toolName: 'webSearchTool', args: { query: 'test' } }]
    } as any);

    await agent.runFreeResearchPhase('1');
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FREE_RESEARCH_COMPLETE);
  });
});
