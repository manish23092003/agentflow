import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from './gemini.js';

// Mock the @ai-sdk/google module
vi.mock('@ai-sdk/google', () => {
  const mockModel = { id: 'mock-model' };
  const mockProvider = vi.fn().mockReturnValue(mockModel);
  return {
    createGoogleGenerativeAI: vi.fn().mockReturnValue(mockProvider),
  };
});

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes correctly with default model', () => {
    const provider = new GeminiProvider('test-api-key');
    expect(provider.modelName).toBe('gemini-3.6-flash');
    const model = provider.getModel();
    expect(model).toBeDefined();
    expect(model).toEqual({ id: 'mock-model' });
  });

  it('initializes correctly with custom model', () => {
    const provider = new GeminiProvider('test-api-key', 'gemini-1.5-flash');
    expect(provider.modelName).toBe('gemini-1.5-flash');
    const model = provider.getModel();
    expect(model).toBeDefined();
    expect(model).toEqual({ id: 'mock-model' });
  });
});
