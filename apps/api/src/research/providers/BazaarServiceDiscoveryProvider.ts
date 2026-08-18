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
    private readonly usdcAssetId: string = config.algorand.usdcAssetId
  ) {
    this.normalizer = new ServiceNormalizer(this.usdcAssetId);
  }

  async discover(topic: string, options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]> {
    console.log(`[BazaarServiceDiscoveryProvider] Discovering services for topic: ${topic}`);

    const url = new URL('/discovery/resources', this.facilitatorUrl);
    // Let the API filter by search term initially
    url.searchParams.set('search', topic);
    url.searchParams.set('limit', '50'); // Pull top 50, we will normalize and truncate locally

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[BazaarServiceDiscoveryProvider] Bazaar API returned ${response.status}`);
        return [];
      }

      const body = await response.json() as BazaarResponse;
      if (!body.items || !Array.isArray(body.items)) {
        console.warn(`[BazaarServiceDiscoveryProvider] Bazaar API returned malformed items array`);
        return [];
      }

      const results: DiscoveredService[] = [];
      const seenIds = new Set<string>();

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
      // Return structured discovery failure as empty list. 
      // The tool or agent will interpret this as "no candidates found".
      return [];
    }
  }
}
