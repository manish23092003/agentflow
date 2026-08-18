// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { config } from '../config.js';
import { GeminiProvider } from '../llm/gemini.js';

async function runVercelAiSdkDiagnostic(toolChoiceMode: 'auto' | 'required') {
  console.log(`\n==================================================`);
  console.log(`VERCEL AI SDK: toolChoice =`, JSON.stringify(toolChoiceMode));
  console.log(`==================================================`);
  
  const llmProvider = new GeminiProvider(config.geminiApiKey, config.geminiModel);
  const model = llmProvider.getModel();

  const pingTool = tool({
    description: 'A simple ping tool',
    parameters: z.object({
      message: z.string().describe('The message to ping with')
    }),
    execute: async ({ message }) => {
      console.log(`[pingTool] executed with message: ${message}`);
      return { ok: true, received: message };
    }
  });

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: 'Call pingTool with message hello and return the tool result.' }],
      tools: { pingTool },
      toolChoice: toolChoiceMode,
      maxSteps: 3
    });

    console.log('--- RESPONSE SUCCESS ---');
    console.log('Model:', result.model?.provider ? `${result.model.provider}:${result.model.modelId}` : 'Unknown');
    console.log('Finish Reason:', result.finishReason);
    console.log('Text:', result.text);
    console.log('Tool Calls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('Tool Results:', JSON.stringify(result.toolResults, null, 2));
    console.log('Warnings:', JSON.stringify(result.warnings, null, 2));
    console.log('Usage:', JSON.stringify(result.usage, null, 2));
  } catch (error: any) {
    console.log('--- RESPONSE ERROR ---');
    console.log('Error Message:', error.message);
    console.log('Error Name:', error.name);
    if (error.statusCode) console.log('Status Code:', error.statusCode);
  }
}

async function main() {
  await runVercelAiSdkDiagnostic('auto');
  await runVercelAiSdkDiagnostic({ type: 'tool', toolName: 'pingTool' });
}

main().catch(console.error);
