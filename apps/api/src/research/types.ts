export interface SearchOptions {
  limit?: number;
  searchDepth?: 'basic' | 'advanced';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  relevanceScore?: number;
}

export interface WebSearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export interface DiscoveredService {
  id: string;
  name: string;
  url: string;
  description: string;
  rawAmount: number;
  decimals: number;
  priceUsdc?: number;
  asset: string;
  network: string;
  paymentScheme: string;
  provider?: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
  source?: string;      // Discovery provenance
}

export interface ServiceDiscoveryOptions {
  maxPriceBaseUnits?: number;
  allowedNetworks?: string[];
  allowedAssets?: string[];
}

export interface ServiceDiscoveryProvider {
  discover(topic: string, options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]>;
}
