// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { config } from '../config.js';
import { GeminiProvider } from '../llm/gemini.js';

async function verifyModelCapability() {
  console.log(`\n==================================================`);
  console.log(`VERIFYING CONFIGURED MODEL`);
  console.log(`==================================================`);
  
  const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
  const model = llmProvider.getModel();

  console.log(`- Configured Model: ${config.geminiModel}`);
  console.log(`- Provider Initialized: true`);

  const pingTool = tool({
    description: 'A simple ping tool',
    parameters: z.object({
      message: z.string()
    }),
    execute: async ({ message }: { message: string }) => {
      return { ok: true, received: message };
    }
  });

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: 'Call pingTool with the message hello.' }],
      tools: {
        pingTool
      },
      toolChoice: 'required',
      maxSteps: 1
    });

    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log(`- Model Request Capability: OK`);
      console.log(`- Tool-Calling Capability: OK`);
    } else {
      console.log(`- Model Request Capability: OK (returned empty tool calls)`);
      console.log(`- Tool-Calling Capability: FAILED`);
    }
  } catch (error: any) {
    console.log(`- Model Request Capability: FAILED`);
    console.log(`- Tool-Calling Capability: FAILED`);
    console.log(`- Error: ${error.message || String(error)}`);
    if (error.statusCode === 429 || error.message?.includes('429')) {
      console.log(`  (Note: Quota Exceeded for ${config.geminiModel})`);
    }
  }
}

verifyModelCapability().catch(console.error);
