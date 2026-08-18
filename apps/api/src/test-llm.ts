// @ts-nocheck
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { config } from './config.js';
import { GeminiProvider } from './llm/gemini.js';

async function testLLM() {
  const llmProvider = new GeminiProvider(config.geminiApiKey, 'gemini-3.6-flash');
  const model = llmProvider.getModel();

  const myTool = tool({
    description: 'Get the weather',
    parameters: z.object({ location: z.string() }),
    execute: async ({ location }: { location: string }) => {
      console.log('Tool called with location:', location);
      return { weather: 'Sunny' };
    }
  });

  console.log('Starting LLM call with model:', config.geminiModel);
  try {
    const result = await generateText({
      model,
      prompt: 'What is the weather in Paris? You MUST use the weather tool.',
      tools: { weatherTool: myTool },
      toolChoice: 'required',
      maxSteps: 3
    });

    console.log('LLM returned text:', result.text);
    console.log('LLM tool calls:', JSON.stringify(result.toolCalls));
  } catch (err) {
    console.error('LLM error:', err);
  }
}

testLLM().catch(console.error);
