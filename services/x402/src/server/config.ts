const EXACT_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=' as `${string}:${string}`;
import { ExactAvmScheme } from '@x402/avm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { ResourceServerExtension } from '@x402/core/types';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { bazaarResourceServerExtension, declareDiscoveryExtension } from '@x402-avm/extensions';
import algosdk from 'algosdk';

export interface RuntimeConfig {
  network: `${string}:${string}`;
  networkName: string;
  payTo: string;
  price: string;
  usdcAssetId: string;
  facilitatorUrl: string;
  port: number;
}

export function loadConfig(): RuntimeConfig {
  const networkName = process.env.ALGORAND_NETWORK;
  if (networkName !== 'testnet') {
    throw new Error('ALGORAND_NETWORK must be "testnet" for this Proof of Concept.');
  }

  const payTo = process.env.X402_PROVIDER_ADDRESS || process.env.X402_PAY_TO_ADDRESS;
  if (!payTo || !algosdk.isValidAddress(payTo)) {
    throw new Error('X402_PROVIDER_ADDRESS must be a valid Algorand address.');
  }

  const price = process.env.X402_PRICE;
  if (!price || isNaN(Number(price))) {
    throw new Error('X402_PRICE must be a valid numeric string.');
  }

  const usdcAssetId = process.env.X402_USDC_ASSET_ID || '0';
  if (isNaN(Number(usdcAssetId))) {
    throw new Error('X402_USDC_ASSET_ID must be configured and valid.');
  }

  const facilitatorUrl = process.env.X402_FACILITATOR_URL;
  if (!facilitatorUrl) {
    throw new Error('X402_FACILITATOR_URL is required.');
  }

  return {
    network: EXACT_TESTNET_CAIP2,
    networkName,
    payTo,
    price,
    usdcAssetId,
    facilitatorUrl,
    port: 3002,
  };
}

export const RESEARCH_DESCRIPTION = 'AgentFlow TestNet Research Intelligence API returning static research insights.';

export function createX402Middleware(config: RuntimeConfig) {
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const server = new x402ResourceServer(facilitator);
  
  // Register the Exact Avm scheme handler
  server.register(config.network, new ExactAvmScheme());
  
  // Support discovery extensions
  server.registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);

  const discovery = declareDiscoveryExtension({
    input: {
      topic: 'algorand',
    },
    inputSchema: {
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to research',
        },
      },
    },
    output: {
      example: {
        topic: 'algorand',
        insight: 'AgentFlow TestNet paid resource successfully unlocked.',
        paymentVerified: true,
        network: 'algorand-testnet'
      },
    },
  });

  console.log('Middleware Config:', { usdcAssetId: config.usdcAssetId });
  return paymentMiddleware(
    {
      'GET /research/insight': {
        accepts: [
          {
            scheme: 'exact',
            price: config.price,
            // @ts-expect-error - Required for actual token amount
            amount: '10000',
            network: config.network,
            // Required by current client implementation
            asset: config.usdcAssetId,
            payTo: config.payTo,
            extra: {
              asset: Number(config.usdcAssetId),
            },
          },
        ],
        description: RESEARCH_DESCRIPTION,
        mimeType: 'application/json',
        extensions: discovery,
      },
      'GET /research/premium': {
        accepts: [
          {
            scheme: 'exact',
            price: '0.10',
            // @ts-expect-error - Required for actual token amount
            amount: '100000',
            network: config.network,
            asset: config.usdcAssetId,
            payTo: config.payTo,
            extra: {
              asset: Number(config.usdcAssetId),
            },
          },
        ],
        description: 'AgentFlow Premium AI Agents Market Growth Research Report (Demo)',
        mimeType: 'application/json',
        extensions: discovery,
      },
    },
    server,
  );
}
