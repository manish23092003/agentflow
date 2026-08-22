import { createAvmPayingClient } from '@agentflow/x402-client';
import type { PolicyDecision } from '../agent/types.js';

export class SigningService {
  private fetchWithPayment: typeof fetch;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowServerPayer = process.env.ALLOW_SERVER_PAYER === 'true' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

    if (isProduction && !allowServerPayer) {
      throw new Error('SigningService: Server-side payer is disabled in production mode. User payments must be signed via connected client wallet (e.g. Pera Wallet).');
    }

    const mnemonic = process.env.X402_CLIENT_MNEMONIC?.trim();
    if (!mnemonic) {
      throw new Error('SigningService: X402_CLIENT_MNEMONIC is missing.');
    }
    
    const network = process.env.ALGORAND_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
    // Initialize paying client using the mnemonic.
    const payingClient = createAvmPayingClient(mnemonic, network);
    
    // We store the bound fetchWithPayment function.
    // The raw signer and mnemonic are kept strictly in this closure/instance
    // and are never returned to the caller.
    this.fetchWithPayment = payingClient.fetchWithPayment;
  }

  /**
   * Executes a payment if and only if the PolicyEngine explicitly approved it.
   * This boundary ensures the AI Agent cannot bypass the policy.
   */
  async executeAuthorizedPayment(
    url: string, 
    options: RequestInit, 
    decision: PolicyDecision
  ): Promise<Response> {
    if (decision.decision !== 'APPROVED') {
      throw new Error(`SigningService Security Violation: Attempted to execute payment without APPROVED status. Status was: ${decision.decision}`);
    }

    // The fetchWithPayment wrapper will intercept the 402, parse it, sign the tx, and retry.
    console.log('SigningService executing fetchWithPayment for URL:', url);
    const res = await this.fetchWithPayment(url, options);
    console.log('SigningService fetchWithPayment returned:', res.status);
    return res;
  }
}
