# Phase 4: PaymentTool Integration

This document covers the integration of the Gemini LLM agent with the real `PaymentTool` boundary.

## Integration Architecture

The `PaymentTool` is exposed to the LLM agent via the Vercel AI SDK `tool()` definition (Zod schema). 

The LLM is strictly limited to passing:
- `url`: The requested resource
- `context`: A brief explanation of the task

**Security Enforcement:**
The LLM *never* sets the payment price, asset, network, or destination. Instead, when the LLM triggers the tool:
1. The tool performs an initial HTTP GET.
2. If it encounters a HTTP 402, the tool extracts the *actual* payment requirements from the HTTP headers (using `x402-client`).
3. These deterministic requirements are passed into the `PolicyEngine`.
4. Only if the `PolicyEngine` approves the transaction will it proceed to the `SigningService`.

## Structured Results

The LLM does not need to parse generic strings or errors to understand payment status. The tool boundary catches all exceptions and normalizes them into structured JSON outputs:
- `SUCCESS`: The resource was successfully unlocked.
- `DENIED`: The `PolicyEngine` blocked the transaction.
- `PAYMENT_FAILED`: An error occurred during signing or settlement.
- `RESOURCE_FAILED`: An error occurred fetching the resource (e.g., 404, or invalid 402 headers).

This structured approach prevents the LLM from hallucinating payment status or getting stuck in loops.

## TestNet Verification

A manual end-to-end verification was performed on Algorand TestNet:
- **Task**: Fetch `http://localhost:3002/research/insight`
- **Result Status**: `SUCCESS`
- **Transaction ID**: `RH5U3CA6QDSR7G3OLUACJWBJGWBMMGQRRXFRJAF5UREJ3BSROGFQ`
- **Explorer URL**: [View on Lora Explorer](https://lora.algokit.io/testnet/transaction/RH5U3CA6QDSR7G3OLUACJWBJGWBMMGQRRXFRJAF5UREJ3BSROGFQ)
- **Amount**: 10000 (0.01 USDC)
- **Asset**: `10458941`
- **Payer & PayTo**: `DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ`
- **Network**: `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`
- **x402 Scheme**: `ExactAvmScheme`
- **Resource Data**: `{"topic":"general","insight":"AgentFlow TestNet paid resource successfully unlocked.","paymentVerified":true,"network":"algorand-testnet"}`

No secret credentials were leaked into the LLM context or execution environment during this transaction.
