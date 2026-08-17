import { config } from 'dotenv';
config({ path: '../../.env' });
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

try {
  const appConfig = loadConfig();
  console.log('Loaded server config:', appConfig);
  const app = createApp(appConfig);

  serve({ fetch: app.fetch, port: appConfig.port }, (info) => {
    console.log(`AgentFlow x402 Server running on http://localhost:${info.port}`);
    console.log('Health endpoint: /health');
    console.log('Protected endpoint: /research/insight');
    console.log(`Payment network: Algorand ${appConfig.networkName}`);
    console.log(`Facilitator: ${appConfig.facilitatorUrl}`);
  });
} catch (error) {
  console.error(`x402 Server could not start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
