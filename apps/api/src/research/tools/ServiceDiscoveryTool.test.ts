import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceDiscoveryTool } from './ServiceDiscoveryTool.js';
import { ResearchSession } from '@prisma/client';
import { ResearchState } from '../../agent/ResearchStateMachine.js';
import { ServiceDiscoveryProvider, DiscoveredService, ServiceDiscoveryOptions } from '../types.js';

class DummyDiscoveryProvider implements ServiceDiscoveryProvider {
  async discover(_topic: string, _options?: ServiceDiscoveryOptions): Promise<DiscoveredService[]> {
    return [
      {
        id: 'svc_1',
        name: 'Svc 1',
        url: 'https://api.example.com',
        description: 'Mock',
        rawAmount: 100000,
        decimals: 6,
        priceUsdc: 0.1,
        asset: '12345',
        network: 'net1',
        paymentScheme: 'exact',
        payTo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
      }
    ];
  }
}

describe('ServiceDiscoveryTool', () => {
  let session: ResearchSession;
  let provider: ServiceDiscoveryProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    session = {
      id: 'session-id',
      userId: 'user-id',
      goal: 'test goal',
      researchBudget: 1000000,
      spent: 200000,
      status: ResearchState.PAID_DISCOVERY,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ResearchSession;
    provider = new DummyDiscoveryProvider();
  });

  it('should block execution in unauthorized states (e.g. SYNTHESIZING)', async () => {
    session.status = ResearchState.SYNTHESIZING;
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    expect(result.error).toContain('not allowed in state: SYNTHESIZING');
  });

  it('should allow execution in PAID_DISCOVERY', async () => {
    session.status = ResearchState.PAID_DISCOVERY;
    const discoverSpy = vi.spyOn(provider, 'discover');
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    
    expect(result.error).toBeUndefined();
    expect(discoverSpy).toHaveBeenCalled();
    expect(result.candidates.length).toBe(1);
  });

  it('should allow execution in ALTERNATIVE_DISCOVERY', async () => {
    session.status = ResearchState.ALTERNATIVE_DISCOVERY;
    const discoverSpy = vi.spyOn(provider, 'discover');
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    
    expect(result.error).toBeUndefined();
    expect(discoverSpy).toHaveBeenCalled();
  });

  it('should cap maxPrice to remaining budget', async () => {
    // Remaining budget is 1000000 - 200000 = 800000
    const discoverSpy = vi.spyOn(provider, 'discover');
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tool.execute({ topic: 'test', maxPrice: 1.5 }, {} as any);
    
    // The provider should be called with maxPriceBaseUnits capped at 800000
    expect(discoverSpy).toHaveBeenCalledWith('test', expect.objectContaining({
      maxPriceBaseUnits: 800000
    }));
  });

  it('should return error if budget is fully exhausted', async () => {
    session.spent = 1000000;
    const discoverSpy = vi.spyOn(provider, 'discover');
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    
    expect(result.error).toContain('budget is fully exhausted');
    expect(discoverSpy).not.toHaveBeenCalled();
  });

  it('should use remaining budget if LLM provides no maxPrice', async () => {
    const discoverSpy = vi.spyOn(provider, 'discover');
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tool.execute({ topic: 'test' }, {} as any);
    
    expect(discoverSpy).toHaveBeenCalledWith('test', expect.objectContaining({
      maxPriceBaseUnits: 800000
    }));
  });

  it('should return empty result message if provider finds no candidates', async () => {
    vi.spyOn(provider, 'discover').mockResolvedValue([]);
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    
    expect(result.message).toContain('No eligible services found');
    expect(result.candidates).toEqual([]);
  });

  it('should handle and wrap provider exceptions cleanly', async () => {
    vi.spyOn(provider, 'discover').mockRejectedValue(new Error('Network drop'));
    const tool = createServiceDiscoveryTool(session, provider);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await tool.execute({ topic: 'test' }, {} as any)) as any;
    
    expect(result.error).toContain('Failed to discover services due to API error: Network drop');
  });
});
