import { config } from 'dotenv';
import algosdk from 'algosdk';

config({ path: '../../.env' });

async function checkBalances() {
  const algod = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
  const mnemonic = process.env.X402_CLIENT_MNEMONIC;
  if (!mnemonic) {
    console.error('X402_CLIENT_MNEMONIC not set in .env');
    return;
  }
  
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const addr = account.addr.toString();
  
  console.log(`Checking balances for Payer: ${addr}`);
  
  try {
    const acctInfo = await algod.accountInformation(addr).do();
    const algoBalance = Number(acctInfo.amount) / 1_000_000;
    console.log(`ALGO Balance: ${algoBalance} ALGO`);
    
    const usdcAssetId = Number(process.env.X402_USDC_ASSET_ID) || 10458941;
    const assetInfo = await algod.getAssetByID(usdcAssetId).do();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decimals = (assetInfo as Record<string, unknown>).params && typeof (assetInfo as Record<string, any>).params === 'object' ? (assetInfo as Record<string, any>).params.decimals || 6 : 6;
    const usdcAsset = acctInfo.assets?.find((a: Record<string, unknown>) => a['asset-id'] === usdcAssetId);
    
    if (usdcAsset) {
      console.log(`USDC Balance: ${Number(usdcAsset.amount) / Math.pow(10, decimals)} USDC`);
    } else {
      console.log(`Not opted into USDC (Asset ${usdcAssetId})`);
      if (algoBalance > 0.2) {
        console.log(`Attempting to opt-in to USDC...`);
        const params = await algod.getTransactionParams().do();
        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: addr,
          receiver: addr,
          assetIndex: usdcAssetId,
          amount: 0,
          suggestedParams: params
        });
        const signedTxn = txn.signTxn(account.sk);
        const { txId } = await algod.sendRawTransaction(signedTxn).do();
        console.log(`Opt-in transaction sent: ${txId}. Waiting for confirmation...`);
        await algosdk.waitForConfirmation(algod, txId, 4);
        console.log('Confirmed!');
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('TestNet check failed:', errorMsg);
    console.log(`The account might not exist on-chain yet. Please fund it with ALGO!`);
  }
}

checkBalances().catch(console.error);
