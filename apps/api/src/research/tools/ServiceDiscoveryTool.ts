import { createCompatibleTool } from '../../agent/ai-sdk-adapter.js';
import { z } from 'zod';
import { ResearchSession } from '@prisma/client';
import { ResearchState } from '../../agent/ResearchStateMachine.js';
import { ServiceDiscoveryProvider } from '../types.js';
import { config } from '../../config.js';
import { researchEvents } from '../ResearchEventService.js';

export function createServiceDiscoveryTool(
  session: ResearchSession,
  provider: ServiceDiscoveryProvider
) {
  return createCompatibleTool({
    description: `Discover premium, paid x402-compatible services from the Bazaar directory. Use this when the free information is insufficient and you need to procure paid data. 
Returns a list of candidate services with their prices, networks, and URLs.
Do NOT fabricate payment credentials or guess facilitator URLs.
Input a specific topic to search for.`,
    parameters: z.object({
      topic: z.string().describe('The topic or service capability to search for.'),
      maxPrice: z.number().optional().describe('Optional maximum price preference in USDC. Will be bounded by remaining session budget.')
    }),
    execute: async ({ topic, maxPrice }: { topic: string; maxPrice?: number }) => {
      console.log(`[ServiceDiscoveryTool] execute() called with topic: "${topic}"`);

      // 1. State Gating
      if (session.status !== ResearchState.PAID_DISCOVERY && session.status !== ResearchState.ALTERNATIVE_DISCOVERY) {
        console.warn(`[ServiceDiscoveryTool] Execution blocked. Current state: ${session.status}`);
        return {
          error: `Service discovery is not allowed in state: ${session.status}. You may only discover paid services during PAID_DISCOVERY or ALTERNATIVE_DISCOVERY.`
        };
      }

      // 2. Budget Authority
      const remainingBudget = session.researchBudget - session.spent;
      if (remainingBudget <= 0) {
        return {
          error: 'Session research budget is fully exhausted. Cannot discover new paid services.'
        };
      }

      const effectiveMaxPriceBaseUnits = Math.min(
        typeof maxPrice === 'number' ? maxPrice * 1000000 : remainingBudget,
        remainingBudget
      );

      // 3. Define allowed parameters based on config
      const allowedNetworks = [
        config.x402.network,
        'testnet',
        'algorand-testnet',
        'algorand:testnet',
        'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI='
      ];
      const allowedAssets = [config.algorand.usdcAssetId];

      console.log(`[ServiceDiscoveryTool] Searching for '${topic}' (Max Price Base Units: ${effectiveMaxPriceBaseUnits})`);

      try {
        const candidates = await provider.discover(topic, {
          maxPriceBaseUnits: effectiveMaxPriceBaseUnits,
          allowedNetworks,
          allowedAssets
        });

        if (candidates.length === 0) {
          return {
            message: `No eligible services found for topic '${topic}' under budget limits.`,
            candidates: []
          };
        }

        candidates.forEach(c => {
          researchEvents.emitServiceDiscovered(session.id, {
            id: c.id,
            name: c.name,
            cost: c.priceUsdc ?? 0,
            provider: 'Bazaar'
          });
        });

        // Return a sanitized list to the LLM
        return {
          message: `Found ${candidates.length} candidate services. You may now evaluate these and choose one to request payment approval for via the orchestrator.`,
          candidates: candidates.map(c => ({
            id: c.id,
            name: c.name,
            url: c.url,
            description: c.description,
            priceUsdc: c.priceUsdc,
            network: c.network,
            asset: c.asset,
            capabilities: c.capabilities
          }))
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          error: `Failed to discover services due to API error: ${msg}`
        };
      }
    }
  });
}
