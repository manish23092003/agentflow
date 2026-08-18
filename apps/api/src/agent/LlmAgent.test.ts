import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmAgent } from './LlmAgent.js';
import { memoryStore } from './memory.js';
import type { LLMProvider } from '../llm/provider.js';
import type { PaymentTool } from './PaymentTool.js';
import type { UserSpendingPolicy } from './types.js';

// Mock the 'ai' module so we don't call real models
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({
      text: 'Mock LLM Response',
      toolCalls: []
    }),
    tool: vi.fn().mockImplementation((config) => config)
  };
});

describe('LlmAgent', () => {
  const mockProvider: LLMProvider = {
    getModel: vi.fn().mockReturnValue({ id: 'mock-model' }),
    modelName: 'mock-model-name'
  };

  const mockPaymentTool = {
    fetchResource: vi.fn()
  } as unknown as PaymentTool;

  const dummyPolicy: UserSpendingPolicy = {
    maxPerTransaction: 100,
    dailyLimit: 1000,
    allowedAssets: [],
    allowedNetworks: [],
    requireApprovalAbove: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear out memory before each test
    // We can't access private members easily but we can reset the state if needed, or just let it create new sessions.
  });

  it('initializes and executes a chat correctly', async () => {
    const agent = new LlmAgent(mockProvider, mockPaymentTool);
    const response = await agent.chat('Test task', dummyPolicy);
    
    expect(response.sessionId).toBeDefined();
    expect(response.message).toBe('Mock LLM Response');
    expect(response.metadata.model).toBe('mock-model-name');
    expect(response.metadata.status).toBe('COMPLETED');
    expect(response.metadata.toolCalls).toEqual([]);

    // Verify memory was updated
    const history = memoryStore.getHistory(response.sessionId);
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('Test task');
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toBe('Mock LLM Response');
  });

  it('handles provider errors gracefully', async () => {
    const agent = new LlmAgent(mockProvider, mockPaymentTool);
    
    const { generateText } = await import('ai');
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Provider timeout'));

    const response = await agent.chat('Test task', dummyPolicy);
    expect(response.metadata.status).toBe('FAILED');
    expect(response.message).toContain('Provider timeout');
  });
});
