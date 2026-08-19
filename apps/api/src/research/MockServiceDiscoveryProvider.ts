import { ServiceDiscoveryProvider, DiscoveredService, ServiceDiscoveryOptions } from './types.js';

export class MockServiceDiscoveryProvider implements ServiceDiscoveryProvider {
  async discover(topic: string, options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]> {
    console.log(`[MockServiceDiscoveryProvider] Discovering services for topic: ${topic}`);
    
    const candidates: DiscoveredService[] = [
      {
        id: 'mock_bazaar_1',
        name: 'Bazaar Mock Data Service',
        url: 'http://localhost:3002/api/v1/bazaar/dataset',
        description: 'Mock data set for testing.',
        rawAmount: 100000, decimals: 6,
        asset: '10458941',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        paymentScheme: 'exact',
        source: 'mock-bazaar'
      },
      {
        id: 'mock_bazaar_2',
        name: 'Premium AI Insights',
        url: 'https://api.example.com/premium-ai',
        description: 'Premium AI research data with quantitative insights.',
        rawAmount: 500000, decimals: 6,
        asset: '10458941',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        paymentScheme: 'exact',
        source: 'mock-bazaar'
      }
    ];

    return candidates.filter(c => {
      if (options?.maxPriceBaseUnits !== undefined && c.rawAmount > options.maxPriceBaseUnits) return false;
      if (options?.allowedNetworks && !options.allowedNetworks.includes(c.network)) return false;
      if (options?.allowedAssets && !options.allowedAssets.includes(c.asset)) return false;
      return true;
    });
  }
}
