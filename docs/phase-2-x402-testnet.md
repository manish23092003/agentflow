# Phase 2: x402 Algorand TestNet Proof of Concept

This document summarizes the execution and verification of the x402 Algorand TestNet Proof of Concept for AgentFlow.

## Objective
Prove a complete x402 payment lifecycle on Algorand TestNet using an official/recommended implementation pattern.

## Technical Stack
- **Framework:** Hono (Node Server)
- **x402 Libraries:** `@x402/core` v2.22.0, `@x402/avm` v2.22.0, `@x402/fetch` v2.22.0
- **Algorand SDK:** `algosdk` v3.6.0
- **Facilitator:** GoPlausible (`https://facilitator.goplausible.xyz/`)

## Architecture
- **Server (`services/x402/src/server`):** Implements an HTTP server using Hono, protected by the `@x402/hono` middleware. Exposes `/health` (unprotected) and `/research/insight` (protected).
- **Client (`services/x402/src/client`):** 
  - `unpaid-client.ts`: Demonstrates server rejecting an unauthorized request with HTTP 402 and returning the x402 payment challenge.
  - `paid-client.ts`: Demonstrates an end-to-end payment by generating a signed Algorand TestNet transaction, submitting it as an `Authorization` header, and receiving the unlocked resource.
  - `lib.ts`: Core client utility configuring `@x402/fetch` `x402Client` with `ExactAvmScheme`.

## Verification Steps

### Phase 2A: Protocol Proof with Zero-Value Transaction
1. Configured the server to require a payment of `0` ALGO (Asset ID 0) on the Algorand Testnet.
2. Generated a disposable TestNet payer wallet and receiver wallet.
3. Used the Algorand TestNet Dispenser to fund the payer wallet with 10 TestNet ALGO.
4. Ran the server locally (`npm -w services/x402 run dev`).
5. Executed `npm -w services/x402 run client:paid`.
6. Verified the exact payment scheme via HTTP 402, client signing, and GoPlausible Facilitator settlement.
**Transaction ID:** `POXOTMJFGK5SDAYOE4U2RYAHHLHWFLXAWMY4VEYASR24AVIEZMJQ`

### Phase 2B: Real Non-Zero TestNet USDC Payment
1. Updated `.env` to configure a non-zero price (`X402_PRICE=0.01`) and standard USDC TestNet asset (`X402_USDC_ASSET_ID=10458941`).
2. Generated a safe new payer wallet and executed an asset opt-in transaction.
3. Transferred 20 USDC to the payer wallet and verified the on-chain balances.
4. Set the receiver (PayTo) address to the newly configured wallet.
5. Ran the server and executed `npm -w services/x402 run client:paid`.
6. Verified a genuine non-zero USDC transaction was successfully settled.
**Transaction ID:** `6RZPBXPIK3BXFSJNRS5DY4HQBLJRMAL3OFQ2EPFRGWPG2XROM6CQ`

## Results
The payment flow executed flawlessly in both zero-value and non-zero-value scenarios.
- The client attempted to access `/research/insight` and received a `402 Payment Required` challenge.
- The `fetchWithPayment` wrapper parsed the challenge, generated a signed Algorand transaction using the payer's private key, and automatically retried the request with the `Authorization` header.
- The server submitted the payment to the GoPlausible Facilitator for verification.
- The Facilitator settled the transaction on the Algorand TestNet (or recorded it, in the zero-value case) and responded with success.
- The server granted access to the protected resource, returning HTTP 200 with the JSON payload.

**Example Successful Non-Zero USDC Transaction on TestNet:**
- **Transaction ID:** `6RZPBXPIK3BXFSJNRS5DY4HQBLJRMAL3OFQ2EPFRGWPG2XROM6CQ`
- **Explorer Link:** [https://testnet.explorer.perawallet.app/tx/6RZPBXPIK3BXFSJNRS5DY4HQBLJRMAL3OFQ2EPFRGWPG2XROM6CQ](https://testnet.explorer.perawallet.app/tx/6RZPBXPIK3BXFSJNRS5DY4HQBLJRMAL3OFQ2EPFRGWPG2XROM6CQ)

## Conclusion
The x402 protocol successfully gates content and enforces BOTH zero and non-zero payment requirements using custom Algorand Standard Assets (ASAs) on the TestNet. Phase 2 is completely verified.
