import type { LanguageModel } from 'ai';

/**
 * Defines the generic interface for our AI provider.
 * This abstraction ensures the rest of the application is not tightly coupled to a specific vendor (e.g., Gemini vs OpenAI).
 */
export interface LLMProvider {
  /**
   * Returns the underlying Vercel AI SDK language model instance.
   */
  getModel(): LanguageModel;
  
  /**
   * The name of the currently configured model.
   */
  readonly modelName: string;
}
