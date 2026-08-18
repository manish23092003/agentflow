import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { LLMProvider } from './provider.js';

export class GeminiProvider implements LLMProvider {
  private readonly google: ReturnType<typeof createGoogleGenerativeAI>;
  private readonly model: LanguageModel;

  constructor(apiKey: string, public readonly modelName: string = 'gemini-1.5-pro') {
    this.google = createGoogleGenerativeAI({
      apiKey,
    });
    this.model = this.google(this.modelName) as unknown as LanguageModel; // Type casting as Vercel AI SDK types can be weird
  }

  getModel(): LanguageModel {
    return this.model;
  }
}
