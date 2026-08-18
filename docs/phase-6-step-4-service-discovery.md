# Phase 6 Step 4: Service Discovery Implementation

This document outlines the implementation details for integrating real x402/Bazaar service discovery into AgentFlow.

## Architecture & Implementation

### Discovery Endpoint Used
We successfully integrated with the official GoPlausible Facilitator API:
`GET https://facilitator.goplausible.xyz/discovery/resources`

The API supports server-side filtering via the `?search` query parameter, which we leverage to pass the LLM's `topic` constraint to the backend. The API returns an `items` array with raw discovery metadata.

### Response Normalization
The raw `items` returned by the API are passed through the `ServiceNormalizer`. The normalizer maps the data into `DiscoveredService` objects.

**Filtering Rules:**
A discovered service is considered eligible and returned only if:
1. It contains a valid `resourceUrl`.
2. It contains an `accepts` array with at least one payment option.
3. The selected payment option has a supported scheme (currently only `exact`).
4. The selected network matches the allowed networks derived from `ALGORAND_NETWORK` (e.g., `algorand:testnet`).
5. The selected asset matches the configured allowed assets (e.g., `X402_USDC_ASSET_ID`).
6. The price can be accurately determined. We rely on the `extra.decimals` field to calculate the exact USDC price (`amount / 10^decimals`). If `extra.decimals` is missing, we only fallback to 6 decimals if the asset exactly matches the application's known USDC asset ID. Otherwise, we do not guess, and the candidate is rejected.
7. The normalized price is less than or equal to the effective maximum allowed price.

### Budget Enforcement
The application derives the absolute ceiling for what a service can cost based on:
`remainingBudget = session.researchBudget - session.spent`

The LLM is allowed to provide a `maxPrice` preference. However, the effective maximum price passed to the provider is strictly bounded:
`effectiveMaxPrice = min(LLM maxPrice, remainingBudget)`

If the LLM provides no preference, the application enforces the full `remainingBudget`.

### State Gating & No Payment
The `ServiceDiscoveryTool` is strictly gated to the `PAID_DISCOVERY` and `ALTERNATIVE_DISCOVERY` states.
This phase focuses exclusively on **discovery**. The tool returns a list of candidate services to the LLM. It does not invoke `PaymentTool`, nor does it create a `PaymentRecord` or interact with the `SigningService`.

## Manual Verification
A manual verification script (`manual-test-discovery.ts`) was created to test the complete flow.
Searching for `"premium AI research data"` properly fetches from the Bazaar API, successfully drops unmatched or out-of-budget/wrong-network items via the normalizer, and surfaces the remaining eligible candidates to the LLM context. No real payment logic was executed.

## Known API Limitations
1. The `?search` query string parameter does a basic textual match on the GoPlausible backend.
2. The Bazaar results require strict client-side validation to ensure network and asset IDs match the local node configuration (Testnet vs Mainnet), as the catalog contains resources across multiple networks.
