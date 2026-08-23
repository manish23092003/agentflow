import { DiscoveredService, ServiceDiscoveryOptions } from '../types.js';

export interface RawBazaarResource {
  id?: string;
  resourceUrl?: string;
  method?: string;
  description?: string;
  mimeType?: string;
  merchantId?: string;
  accepts?: RawAccepts[];
  discoveryInfo?: Record<string, unknown>;
}

export interface RawAccepts {
  scheme?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payTo?: string;
  maxTimeoutSeconds?: number;
  extra?: {
    decimals?: number;
    [key: string]: unknown;
  };
}

export class ServiceNormalizer {
  constructor(private configuredUsdcAssetId: string) {}

  public normalize(raw: RawBazaarResource, options?: ServiceDiscoveryOptions): DiscoveredService | null {
    if (!raw.resourceUrl) return null;
    
    // Valid URL check
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(raw.resourceUrl);
    } catch {
      return null;
    }

    if (!raw.accepts || raw.accepts.length === 0) return null;

    // Find the first acceptable payment option
    let selectedAccepts: RawAccepts | null = null;
    let computedPrice: number | null = null;

    for (const option of raw.accepts) {
      if (!option.scheme || !option.network || !option.asset || !option.amount) continue;

      // Filter by allowed networks/assets/schemes
      if (options?.allowedNetworks && options.allowedNetworks.length > 0) {
        if (!options.allowedNetworks.includes(option.network)) continue;
      }

      if (options?.allowedAssets && options.allowedAssets.length > 0) {
        if (!options.allowedAssets.includes(option.asset)) continue;
      }
      
      // Currently only exact scheme is supported in AgentFlow
      if (option.scheme !== 'exact') continue;

      // Price calculation
      let decimals = option.extra?.decimals;
      
      if (typeof decimals !== 'number') {
        if (option.asset === this.configuredUsdcAssetId) {
          decimals = 6;
        } else {
          // Unknown asset and no decimals provided - do not guess, reject candidate
          continue;
        }
      }

      const rawAmount = Number(option.amount);
      if (isNaN(rawAmount) || rawAmount < 0) continue;

      const price = rawAmount / (10 ** decimals);

      // Check against options maxPriceBaseUnits
      if (typeof options?.maxPriceBaseUnits === 'number' && rawAmount > options.maxPriceBaseUnits) {
        continue;
      }

      // Valid option found
      selectedAccepts = option;
      computedPrice = price;
      break;
    }

    if (!selectedAccepts || computedPrice === null) {
      return null; // No eligible payment option found
    }

    const rawAmount = Number(selectedAccepts.amount);
    let finalDecimals = selectedAccepts.extra?.decimals;
    if (typeof finalDecimals !== 'number') {
        finalDecimals = 6;
    }

    return {
      id: raw.id || Buffer.from(raw.resourceUrl).toString('base64url'),
      name: `Bazaar Service (${parsedUrl.hostname})`,
      url: raw.resourceUrl,
      description: raw.description || 'No description provided.',
      rawAmount: rawAmount,
      decimals: finalDecimals,
      priceUsdc: computedPrice,
      asset: selectedAccepts.asset!,
      network: selectedAccepts.network!,
      paymentScheme: selectedAccepts.scheme!,
      payTo: selectedAccepts.payTo || process.env.X402_PROVIDER_ADDRESS || 'unknown',
      provider: raw.merchantId,
      capabilities: [raw.method || 'GET'],
      metadata: {
        raw, // Preserve raw metadata
        mimeType: raw.mimeType,
        discoveryInfo: raw.discoveryInfo
      },
      source: 'goplausible-bazaar'
    };
  }
}
