import { DiscoveredService, ServiceDiscoveryOptions, ServiceDiscoveryProvider } from '../types.js';
import { RawBazaarResource, ServiceNormalizer } from './ServiceNormalizer.js';
import { config } from '../../config.js';

interface BazaarResponse {
  items?: RawBazaarResource[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export class BazaarServiceDiscoveryProvider implements ServiceDiscoveryProvider {
  private normalizer: ServiceNormalizer;

  constructor(
    private readonly facilitatorUrl: string = config.x402.facilitatorUrl,
    private readonly usdcAssetId: string = config.algorand.usdcAssetId,
    private readonly demoMode: boolean = config.demoMode
  ) {
    this.normalizer = new ServiceNormalizer(this.usdcAssetId);
  }

  async discover(topic: string, options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]> {
    console.log(`[BazaarServiceDiscoveryProvider] Discovering services for topic: ${topic}`);

    const url = new URL('/discovery/resources', this.facilitatorUrl);
    url.searchParams.set('search', topic);
    url.searchParams.set('limit', '50');

    const results: DiscoveredService[] = [];
    const seenIds = new Set<string>();

    if (this.demoMode) {
      const demoCandidate: DiscoveredService = {
        id: 'premium-ai-agents-2026',
        name: 'AI Agents Market Growth Report 2026',
        url: config.demoPaidResourceUrl,
        description: 'Verified quantitative projections, revenue forecasts, enterprise adoption metrics, and premium market intelligence for AI agent growth in 2026.',
        priceUsdc: 0.10,
        rawAmount: 100000,
        decimals: 6,
        asset: this.usdcAssetId,
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        paymentScheme: 'exact',
        source: 'x402-demo-fixture',
        capabilities: ['quantitative projections', 'market sizing', 'revenue forecasts', 'enterprise adoption']
      };

      const allowsPrice = options?.maxPriceBaseUnits === undefined || demoCandidate.rawAmount <= options.maxPriceBaseUnits;
      const allowsNetwork = !options?.allowedNetworks || options.allowedNetworks.some(n => n.toLowerCase().includes('testnet') || n === demoCandidate.network);
      const allowsAsset = !options?.allowedAssets || options.allowedAssets.includes(demoCandidate.asset);

      if (allowsPrice && allowsNetwork && allowsAsset) {
        seenIds.add(demoCandidate.id);
        results.push(demoCandidate);
      }
    }

    try {
      let response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json'
        }
      });

      // If remote search returned 500 or non-ok, retry without search parameter
      if (!response.ok && url.searchParams.has('search')) {
        const fallbackUrl = new URL('/discovery/resources', this.facilitatorUrl);
        fallbackUrl.searchParams.set('limit', '100');
        response = await fetch(fallbackUrl.toString(), { headers: { 'Accept': 'application/json' } });
      }

      if (!response.ok) {
        console.error(`[BazaarServiceDiscoveryProvider] Bazaar API returned ${response.status}`);
        return results;
      }

      let body = await response.json() as BazaarResponse;
      
      // If search query was passed but yielded no items, fall back to general registry
      if ((!body.items || body.items.length === 0) && url.searchParams.has('search')) {
        const fallbackUrl = new URL('/discovery/resources', this.facilitatorUrl);
        fallbackUrl.searchParams.set('limit', '100');
        const fallbackRes = await fetch(fallbackUrl.toString(), { headers: { 'Accept': 'application/json' } });
        if (fallbackRes.ok) {
          body = await fallbackRes.json() as BazaarResponse;
        }
      }

      if (!body.items || !Array.isArray(body.items)) {
        console.warn(`[BazaarServiceDiscoveryProvider] Bazaar API returned malformed items array`);
        return results;
      }

      for (const raw of body.items) {
        const normalized = this.normalizer.normalize(raw, options);
        if (normalized) {
          // Deduplicate
          if (!seenIds.has(normalized.id)) {
            seenIds.add(normalized.id);
            results.push(normalized);
          }
        }
      }

      console.log(`[BazaarServiceDiscoveryProvider] Found ${results.length} valid eligible services`);
      
      // Limit to top 5 results for LLM context size
      return results.slice(0, 5);
      
    } catch (error) {
      console.error(`[BazaarServiceDiscoveryProvider] Discovery fetch failed:`, error);
      // Return structured discovery results (including demo fixture if enabled)
      return results;
    }
  }
}
