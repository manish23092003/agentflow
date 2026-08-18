import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BazaarServiceDiscoveryProvider } from './BazaarServiceDiscoveryProvider.js';

describe('BazaarServiceDiscoveryProvider', () => {
  let provider: BazaarServiceDiscoveryProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new BazaarServiceDiscoveryProvider('https://mock.facilitator', '12345');
  });

  it('should fetch and normalize results from the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'svc_1',
            resourceUrl: 'https://api.example.com/1',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '1000000' }]
          },
          {
            id: 'svc_2',
            resourceUrl: 'https://api.example.com/2',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '2000000' }]
          }
        ]
      })
    });

    const results = await provider.discover('test');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock.facilitator/discovery/resources?search=test&limit=50',
      expect.any(Object)
    );
    expect(results.length).toBe(2);
    expect(results[0].rawAmount).toBe(1000000);
    expect(results[0].priceUsdc).toBe(1.0); // 1000000 / 10^6
    expect(results[1].rawAmount).toBe(2000000);
    expect(results[1].priceUsdc).toBe(2.0); // 2000000 / 10^6
  });

  it('should return empty array on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const results = await provider.discover('test');
    expect(results).toEqual([]);
  });

  it('should limit results to top 5', async () => {
    const rawData = Array.from({ length: 10 }).map((_, i) => ({
      id: `svc_${i}`,
      resourceUrl: `https://api.example.com/${i}`,
      accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '1000000' }]
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: rawData })
    });

    const results = await provider.discover('test');
    expect(results.length).toBe(5);
  });

  it('should deduplicate services by ID', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'duplicate_id',
            resourceUrl: 'https://api.example.com/1',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '1000000' }]
          },
          {
            id: 'duplicate_id',
            resourceUrl: 'https://api.example.com/2',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '2000000' }]
          }
        ]
      })
    });

    const results = await provider.discover('test');
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('https://api.example.com/1');
  });

  it('should drop un-normalizable items without failing the rest', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            // Missing URL -> Invalid
            id: 'svc_invalid',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '1000000' }]
          },
          {
            id: 'svc_valid',
            resourceUrl: 'https://api.example.com/valid',
            accepts: [{ scheme: 'exact', network: 'net1', asset: '12345', amount: '1000000' }]
          }
        ]
      })
    });

    const results = await provider.discover('test');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('svc_valid');
  });
});
