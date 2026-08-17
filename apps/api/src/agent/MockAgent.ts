import type { PaymentTool } from './PaymentTool.js';
import type { UserSpendingPolicy } from './types.js';

export class MockAgent {
  constructor(private readonly paymentTool: PaymentTool) {}

  /**
   * Simulates an LLM receiving a prompt, identifying a required resource, and using the PaymentTool.
   */
  async runTask(prompt: string, policy: UserSpendingPolicy): Promise<{ result: unknown; logs: string[] }> {
    const logs: string[] = [];
    logs.push(`[MockAgent] Received task: "${prompt}"`);
    logs.push(`[MockAgent] Identifying required resources...`);
    
    // Hardcoded for simulation: The agent determines it needs this endpoint
    const resourceUrl = 'http://localhost:3002/research/insight';
    logs.push(`[MockAgent] Decision: Must fetch ${resourceUrl}`);

    try {
      const fetchResult = await this.paymentTool.fetchResource(
        resourceUrl, 
        policy, 
        `Agent task: ${prompt}`
      );
      
      logs.push(...fetchResult.logs);
      
      let parsedData;
      try {
        parsedData = JSON.parse(fetchResult.data);
      } catch {
        parsedData = fetchResult.data;
      }

      logs.push(`[MockAgent] Task completed successfully.`);
      return { result: parsedData, logs };
      
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logs.push(`[MockAgent] Task aborted due to error: ${errorMsg}`);
      return { result: null, logs };
    }
  }
}
