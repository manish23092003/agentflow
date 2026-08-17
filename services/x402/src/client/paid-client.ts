import { config } from 'dotenv';
config({ path: '../../.env' });
import {
  createPayingClient,
  explainPaymentError,
  readPaymentRequired,
  resourceUrl,
} from './lib.js';

async function main() {
  const url = resourceUrl();
  const payer = createPayingClient();
  const requestId = `client-${Date.now()}`;

  console.log(`[${requestId}] Requesting ${url}...`);
  const unpaid = await fetch(url, { headers: { 'x-request-id': requestId } });
  
  if (unpaid.status !== 402) {
    throw new Error(`Expected HTTP 402 Payment Required, but received HTTP ${unpaid.status}.`);
  }

  const requirement = readPaymentRequired(unpaid);
  console.log('\n[INFO] 402 Payment Required');
  if (requirement) {
    console.log('Requirement:', JSON.stringify(requirement, null, 2));
    console.log(`Price: ${requirement.price} USDC`);
    console.log(`Network: ${requirement.network}`);
  }

  console.log(`Payer Wallet: ${payer.signer.address}`);
  console.log('Preparing and signing x402 payment...');

  console.log('Sending transaction via fetchWithPayment...');
  const response = await payer.fetchWithPayment(url, { headers: { 'x-request-id': requestId } });
  
  if (!response.ok) {
    const paymentError = response.headers.get('x-payment-error');
    throw new Error(`Paid request returned HTTP ${response.status}: ${await response.text()}. x-payment-error: ${paymentError}`);
  }

  // Idempotency: @x402/fetch implements Payment-Identifier implicitly when configured.
  // We extract the settlement status to confirm successful execution.
  const settlement = payer.httpClient.getPaymentSettleResponse(name => response.headers.get(name));
  
  if (!settlement.success) {
    throw new Error(`The resource responded, but settlement was not explicitly confirmed: ${JSON.stringify(settlement)}`);
  }

  console.log('\n[SUCCESS] Payment accepted and settlement confirmed!');
  console.log('[SUCCESS] Resource unlocked.');
  console.log(`Transaction ID: ${settlement.transaction}`);
  
  const explorerNetwork = payer.network.name === 'testnet' ? 'testnet.' : '';
  console.log(`Explorer Link: https://${explorerNetwork}explorer.perawallet.app/tx/${settlement.transaction}`);
  
  console.log('\n--- Paid Resource Response ---');
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log(JSON.stringify(data, null, 2));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Request failed:', errorMsg);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`\n[ERROR] Paid demo failed: ${explainPaymentError(error)}`);
  process.exit(1);
});
