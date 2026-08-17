import algosdk from 'algosdk';
import { ALGORAND_MAINNET_CAIP2, toClientAvmSigner } from '@x402/avm';
export const EXACT_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=' as `${string}:${string}`;
import { ExactAvmScheme } from '@x402/avm/exact/client';
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from '@x402/fetch';

export type ClientNetwork = 'testnet' | 'mainnet';

export function createAvmPayingClient(mnemonic: string, networkName: ClientNetwork) {
  let account: algosdk.Account;
  try {
    account = algosdk.mnemonicToSecretKey(mnemonic);
  } catch {
    throw new Error('CLIENT_MNEMONIC is invalid. It must be a valid 25-word Algorand mnemonic.');
  }

  const network = networkName === 'testnet' ? EXACT_TESTNET_CAIP2 : ALGORAND_MAINNET_CAIP2;
  const signer = toClientAvmSigner(Buffer.from(account.sk).toString('base64'));
  const client = new x402Client();
  
  client.register(network, new ExactAvmScheme(signer));

  return {
    signer,
    network,
    fetchWithPayment: wrapFetchWithPayment(fetch, client),
    httpClient: new x402HTTPClient(client),
  };
}

export interface PaymentRequiredSummary {
  price: string;
  network: string;
  asset: string;
  description: string;
  rawAmount: number;
}

export function readPaymentRequired(response: Response): PaymentRequiredSummary | null {
  const encoded = response.headers.get('payment-required');
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      resource?: { description?: string };
      accepts?: Array<{
        amount?: string;
        network?: string;
        asset?: string;
        extra?: { asset?: string | number; name?: string; decimals?: number };
      }>;
    };
    const requirement = parsed.accepts?.[0];
    const decimals = requirement?.extra?.decimals ?? 6;
    const rawAmount = requirement?.amount ? Number(requirement.amount) : Number.NaN;
    const price = Number.isFinite(rawAmount) ? `$${rawAmount / 10 ** decimals}` : 'See payment requirements';

    return {
      price,
      rawAmount,
      network: requirement?.network ?? 'unknown',
      asset: String(requirement?.asset ?? requirement?.extra?.asset ?? requirement?.extra?.name ?? 'unknown'),
      description: parsed.resource?.description ?? 'Paid x402 resource',
    };
  } catch {
    return null;
  }
}

export function explainPaymentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('opt') && lower.includes('asset')) {
    return `${message}\nThe payer may not be opted into the configured USDC asset.`;
  }
  if (lower.includes('insufficient') || lower.includes('overspend')) {
    return `${message}\nFund the payer with enough ALGO for fees/minimum balance and enough USDC for the request.`;
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return `${message}\nCheck that the x402 server and the GoPlausible facilitator are reachable.`;
  }
  return message;
}
