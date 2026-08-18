import { GeminiProvider } from '../src/llm/gemini.js';
import { LlmAgent } from '../src/agent/LlmAgent.js';
import { PaymentTool } from '../src/agent/PaymentTool.js';
import { PrismaPaymentRepository } from '../src/db/PaymentHistory.js';
import { PolicyEngine } from '../src/agent/PolicyEngine.js';
import { SigningService } from '../src/security/SigningService.js';
import { config } from '../src/config.js';

async function main() {
  console.log('--- Starting Manual Gemini Test ---');

  if (!config.geminiApiKey || config.geminiApiKey === 'test-gemini-api-key') {
    console.error('Error: Real GEMINI_API_KEY is not set in environment.');
    process.exit(1);
  }

  // Initialize the real agent flow but we will NOT authorize any real payments here.
  const db = new PrismaPaymentRepository();
  const policyEngine = new PolicyEngine(db);
  // We use a dummy signing service or just instantiate it (it won't be called if policy is denied or if we don't trigger it).
  const signingService = new SigningService();
  const paymentTool = new PaymentTool(db, policyEngine, signingService);

  const provider = new GeminiProvider(config.geminiApiKey);
  const agent = new LlmAgent(provider, paymentTool);

  const task = "Get the AgentFlow paid research insight. The resource URL is http://localhost:3002/api/v1/protected/data";
  const dummyPolicy = {
    maxPerTransaction: 100000000, 
    dailyLimit: 1000000000,
    allowedAssets: [10458941], // USDC on Algorand TestNet
    allowedNetworks: ['testnet', 'algorand-testnet'],
    requireApprovalAbove: 100000000
  };

  console.log(`Task: "${task}"`);
  console.log('Sending to Gemini via LlmAgent...');

  try {
    const response = await agent.chat(task, dummyPolicy);
    console.log('\n--- Gemini Response ---');
    console.log(response.message);
    console.log('\n--- Execution Metadata ---');
    console.log(JSON.stringify(response.metadata, null, 2));
    console.log('\n--- Test Completed Successfully ---');
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

main().catch(console.error);
