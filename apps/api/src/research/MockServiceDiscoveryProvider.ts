import { ServiceDiscoveryProvider, DiscoveredService, ServiceDiscoveryOptions } from './types.js';

export class MockServiceDiscoveryProvider implements ServiceDiscoveryProvider {
  async discover(topic: string, options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]> {
    console.log(`[MockServiceDiscoveryProvider] Discovering services for topic: ${topic}`);
    
    const candidates: DiscoveredService[] = [
      {
        id: 'premium-ai-agents-2026',
        name: 'AI Agents Market Growth Report 2026',
        url: 'http://localhost:3002/research/premium',
        description: 'Premium research containing market insights, emerging trends and growth analysis.',
        priceUsdc: 0.10,
        rawAmount: 100000,
        decimals: 6,
        asset: '10458941',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        paymentScheme: 'exact',
        payTo: process.env.X402_PROVIDER_ADDRESS || 'NLWHCGS5Q5GEQYV3PCJGQPZ5PK7JBDJBKJBI2W2ZFYGV6YEOHCE5RJVLJU',
        source: 'x402-resource-server'
      },
      {
        id: 'premium-research-insight',
        name: 'AgentFlow TestNet Research Intelligence',
        url: 'http://localhost:3002/research/insight',
        description: 'AgentFlow TestNet Research Intelligence API returning static research insights.',
        priceUsdc: 0.01,
        rawAmount: 10000,
        decimals: 6,
        asset: '10458941',
        network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
        paymentScheme: 'exact',
        payTo: process.env.X402_PROVIDER_ADDRESS || 'NLWHCGS5Q5GEQYV3PCJGQPZ5PK7JBDJBKJBI2W2ZFYGV6YEOHCE5RJVLJU',
        source: 'x402-resource-server'
      }
    ];

    return candidates.filter(c => {
      if (options?.maxPriceBaseUnits !== undefined && c.rawAmount > options.maxPriceBaseUnits) return false;
      if (options?.allowedNetworks && !options.allowedNetworks.some(n => n.toLowerCase().includes('testnet') || n === c.network)) return false;
      if (options?.allowedAssets && !options.allowedAssets.includes(c.asset)) return false;
      return true;
    });
  }
}
