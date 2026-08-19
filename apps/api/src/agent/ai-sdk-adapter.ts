import { tool } from 'ai';
import { z } from 'zod';

/**
 * Compatibility Adapter for Vercel AI SDK 7.x and Zod 4.x
 * 
 * Why it exists:
 * AgentFlow's API layer was upgraded to Zod 4.x, but the installed Vercel AI SDK (ai@7.0.66)
 * internally bundles and depends on Zod 3.x types. This causes strict TypeScript type
 * inference to fail when passing Zod 4 schemas into the `parameters` field of `tool()`,
 * resulting in the `execute` function being rejected as incompatible.
 * 
 * This adapter safely wraps the `tool()` instantiation to preserve strict types
 * for our application code while bypassing the internal Zod 3 vs 4 typing conflict.
 */
export function createCompatibleTool<T extends z.ZodTypeAny>(options: {
  description: string;
  parameters: T;
  execute: (args: z.infer<T>, context?: unknown) => Promise<unknown>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return tool(options as any);
}
