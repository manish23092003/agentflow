import { config } from 'dotenv';
config({ path: '../../.env' });
import { readPaymentRequired, resourceUrl } from './lib.js';

async function main() {
  const url = resourceUrl();
  console.log(`Requesting ${url} without payment...`);
  
  const response = await fetch(url);

  if (response.status === 402) {
    console.log('\n[SUCCESS] Server responded with HTTP 402 Payment Required.');
    const decoded = JSON.parse(Buffer.from(response.headers.get('payment-required') || '', 'base64url').toString('utf8'));
    console.log('Decoded Challenge:', JSON.stringify(decoded, null, 2));
    const requirement = readPaymentRequired(response);
    
    if (requirement) {
      console.log('Payment Requirements:');
      console.log(`- Description: ${requirement.description}`);
      console.log(`- Price: ${requirement.price} USDC`);
      console.log(`- Network: ${requirement.network}`);
      console.log(`- Asset ID: ${requirement.asset}`);
    } else {
      console.log('Server did not return valid x402 payment requirements headers.');
      process.exit(1);
    }
  } else {
    console.log(`\n[ERROR] Expected HTTP 402, but received HTTP ${response.status}.`);
    console.log(await response.text());
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
