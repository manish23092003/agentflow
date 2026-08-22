import { generateText } from 'ai';
import { GeminiProvider } from '../../src/llm/gemini.js';
import { config } from '../../src/config.js';
import { z } from 'zod';
import { createCompatibleTool } from '../agent/ai-sdk-adapter.js';

async function verifyModels() {
  console.log('--- AgentFlow Diagnostic ---');
  console.log('Checking Gemini provider initialization...');
  
  if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
    console.error('Error: GEMINI_API_KEY is missing from environment variables.');
    process.exit(1);
  }
  
  console.log('API Key configured: yes');
  console.log(`Model: ${config.geminiModel}`);
  
  const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
  const model = llmProvider.getModel();
  
  console.log('\nChecking one model request (basic response)...');
  try {
    const result = await generateText({
      model,
      prompt: 'Respond with exactly one word: "OK".',
      maxRetries: 0
    });
    console.log(`Model response: "${result.text}" (Success)`);
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number };
    console.error('Model request failed:', err.message || err);
    if (err.statusCode === 429 || (err.message && err.message.includes('429'))) {
      console.error('\nNOTE: This is a quota exhaustion error (429). The key is valid, but the quota is exhausted.');
    }
    process.exit(1);
  }
  
  await verifyToolCalling(model);
  
  console.log('\n--- Diagnostic Complete ---');
  console.log('Provider, model generation, and tool calling are functioning correctly.');
}

const addNumbersTool = createCompatibleTool({
  description: 'Add two numbers together',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }: { a: number; b: number }) => a + b,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyToolCalling(model: any) {
  console.log('\nChecking tool calling capabilities...');
  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: 'What is 5 + 7? Use the addNumbers tool.' }],
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - The Vercel AI SDK types for tools are complex when crossing workspace packages
      tools: {
        addNumbers: addNumbersTool
      },
      toolChoice: 'required',
      maxRetries: 0
    });
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Ignore type error for diagnostic
      console.log(`Tool called successfully: ${result.toolCalls[0].toolName} with args ${JSON.stringify(result.toolCalls[0].args)}`);
    } else {
      console.error('Tool calling failed: LLM did not return a tool call.');
      process.exit(1);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Tool calling test failed:', err.message || err);
    process.exit(1);
  }
}

verifyModels().catch(console.error);
