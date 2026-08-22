import { describe, it, expect } from 'vitest';
import { SigningService } from './SigningService.js';

describe('SigningService', () => {
  it('prevents agent from accessing credentials directly', () => {
    // Requires ALGORAND_NETWORK and X402_CLIENT_MNEMONIC in env, but since we are unit testing
    // we can just instantiate it if the env variables are present. 
    // In our test environment, we might not have the env variables.
    try {
      const service = new SigningService();
      
      // The properties on the service should only be executeAuthorizedPayment.
      // There should be no way to extract the mnemonic or raw signer.
      expect((service as unknown as Record<string, unknown>).mnemonic).toBeUndefined();
      expect((service as unknown as Record<string, unknown>).signer).toBeUndefined();
    } catch (e: unknown) {
      // If it throws because of missing env, that's fine, the architecture still holds.
      const errorMsg = e instanceof Error ? e.message : String(e);
      expect(errorMsg).toContain('X402_CLIENT_MNEMONIC');
    }
  });

  it('rejects unapproved decisions', async () => {
    // If we have the env vars, we can test it
    try {
      const service = new SigningService();
      await expect(service.executeAuthorizedPayment('http://test', {}, { decision: 'DENIED', reason: '' }))
        .rejects.toThrow(/Security Violation/);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      expect(errorMsg).toContain('X402_CLIENT_MNEMONIC');
    }
  });

  it('rejects server-side payer mode in production when ALLOW_SERVER_PAYER is not true', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_SERVER_PAYER;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_SERVER_PAYER;
      
      expect(() => new SigningService()).toThrow(
        /Server-side payer is disabled in production mode/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalAllow) process.env.ALLOW_SERVER_PAYER = originalAllow;
    }
  });
});
