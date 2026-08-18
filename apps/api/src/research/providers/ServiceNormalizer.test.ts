import { describe, it, expect } from 'vitest';
import { ServiceNormalizer, RawBazaarResource } from './ServiceNormalizer.js';

describe('ServiceNormalizer', () => {
  const USDC_ASSET = '10458941';
  const normalizer = new ServiceNormalizer(USDC_ASSET);

  it('should normalize a valid raw service with configured asset decimals', () => {
    const raw: RawBazaarResource = {
      id: 'mock_1',
      resourceUrl: 'https://api.example.com/data',
      description: 'Premium data',
      method: 'GET',
      merchantId: 'merch_1',
      accepts: [
        {
          scheme: 'exact',
          network: 'algorand:testnet',
          asset: USDC_ASSET,
          amount: '15000', // 0.015 USDC (6 decimals derived from known USDC ID)
        }
      ]
    };

    const res = normalizer.normalize(raw);
    expect(res).not.toBeNull();
    expect(res?.rawAmount).toBe(15000);
    expect(res?.priceUsdc).toBe(0.015);
    expect(res?.asset).toBe(USDC_ASSET);
    expect(res?.source).toBe('goplausible-bazaar');
  });

  it('should normalize using extra.decimals when provided', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        {
          scheme: 'exact',
          network: 'algorand:testnet',
          asset: 'UNKNOWN_ASSET',
          amount: '200',
          extra: { decimals: 2 }
        }
      ]
    };

    const res = normalizer.normalize(raw);
    expect(res).not.toBeNull();
    expect(res?.rawAmount).toBe(200);
    expect(res?.priceUsdc).toBe(2); // 200 / 10^2
  });

  it('should reject unknown assets without explicit decimals', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        {
          scheme: 'exact',
          network: 'algorand:testnet',
          asset: 'UNKNOWN_ASSET',
          amount: '200'
          // no extra.decimals
        }
      ]
    };

    const res = normalizer.normalize(raw);
    expect(res).toBeNull();
  });

  it('should reject services lacking URL or accepts', () => {
    expect(normalizer.normalize({ accepts: [] })).toBeNull();
    expect(normalizer.normalize({ resourceUrl: 'https://a.com' })).toBeNull();
  });

  it('should reject invalid URLs', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'not-a-valid-url',
      accepts: [{ scheme: 'exact', network: 'net', asset: USDC_ASSET, amount: '10' }]
    };
    expect(normalizer.normalize(raw)).toBeNull();
  });

  it('should apply maxPrice filtering', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        { scheme: 'exact', network: 'net', asset: USDC_ASSET, amount: '5000000' } // 5.0 USDC
      ]
    };

    expect(normalizer.normalize(raw, { maxPriceBaseUnits: 4000000 })).toBeNull();
    expect(normalizer.normalize(raw, { maxPriceBaseUnits: 6000000 })).not.toBeNull();
  });

  it('should apply allowedNetworks filtering', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        { scheme: 'exact', network: 'allowed_net', asset: USDC_ASSET, amount: '10' }
      ]
    };

    expect(normalizer.normalize(raw, { allowedNetworks: ['other_net'] })).toBeNull();
    expect(normalizer.normalize(raw, { allowedNetworks: ['allowed_net'] })).not.toBeNull();
  });

  it('should apply allowedAssets filtering', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        { scheme: 'exact', network: 'net', asset: 'asset_1', amount: '10', extra: { decimals: 0 } }
      ]
    };

    expect(normalizer.normalize(raw, { allowedAssets: ['asset_2'] })).toBeNull();
    expect(normalizer.normalize(raw, { allowedAssets: ['asset_1'] })).not.toBeNull();
  });

  it('should pick the first acceptable option', () => {
    const raw: RawBazaarResource = {
      resourceUrl: 'https://api.example.com/data',
      accepts: [
        { scheme: 'exact', network: 'net', asset: 'unallowed', amount: '10', extra: { decimals: 0 } },
        { scheme: 'exact', network: 'net', asset: USDC_ASSET, amount: '5000000' } // 5 USDC
      ]
    };

    const res = normalizer.normalize(raw, { allowedAssets: [USDC_ASSET] });
    expect(res?.asset).toBe(USDC_ASSET);
    expect(res?.rawAmount).toBe(5000000);
    expect(res?.priceUsdc).toBe(5);
  });
});
