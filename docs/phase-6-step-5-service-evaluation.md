# Phase 6 Step 5: Service Evaluation + Procurement Justification

## Overview
Phase 6 Step 5 implements the `ServiceEvaluationService` which evaluates discovered paid resources from the `BazaarServiceDiscoveryProvider` against the user's research gap and remaining budget.

## Base-Unit Money Model
AgentFlow's money model has been updated to strictly enforce base units for all authoritative payment tracking, policy decisions, and constraints.
- `ResearchSession.researchBudget` and `spent` are stored in base units (e.g. `200000` = $0.20 USDC).
- `DiscoveredService` exposes the raw authoritative `rawAmount` derived directly from Bazaar metadata (`extra.decimals` applies only for display via `priceUsdc`).
- Comparisons against the budget strictly use base units: `service.rawAmount <= (session.researchBudget - session.spent)`.
- The `PolicyEngine` evaluates the integer base unit `rawAmount` rather than normalized decimals.

## Evaluation Flow
1. **Gating**: Only executed if session status is `SERVICE_EVALUATION`.
2. **Context Passing**: LLM is provided the research gap (missing info, importance) and a list of safe candidate services scrubbed of raw payment constraints, retaining only `priceUsdc` and descriptions for ranking.
3. **LLM Evaluation**: LLM assesses candidate relevance and outputs a structured evaluation containing `selectedServiceId`, `reason`, `expectedValue`, `alternative`, and `relevanceScore`.
4. **Deterministic Validation**:
    - Validate `selectedServiceId` exists in the original candidates list.
    - Validate `rawAmount` fits within `remainingBudgetBaseUnits`.
    - Validate resource URL and metadata presence.
5. **Policy Routing**: Application routes the trusted, discovered metadata to the `PolicyEngine`.
6. **Persistence**: Recommendation is stored in `PaidResourceRecommendation` with status bound to the Policy outcome.
7. **Transition**: State is transitioned according to the policy (e.g. `PAYMENT_AUTHORIZED`, `PENDING_APPROVAL`, or `ALTERNATIVE_DISCOVERY`).

## Deterministic Metadata Resolution
The LLM is explicitly prevented from hallucinating prices, networks, assets, or URLs.
The Zod schema restricts the LLM output to purely qualitative reasoning and a `selectedServiceId`. The application then uses this ID to map back to the actual, trusted `DiscoveredService` candidate fetched from the Provider, extracting `rawAmount`, `network`, `asset`, `paymentScheme`, and `url` without risking LLM fabrication.

## No-Service Fallback
If the LLM deems no candidates worthy of the price or if zero candidates were discovered by the provider, the evaluator gracefully transitions the session:
- The state transitions directly to `SYNTHESIZING`.
- A recommendation with `NO_ELIGIBLE_SERVICE` status is recorded indicating why the paid approach was aborted.

## Security Tests
We have added deterministic tests to verify that:
1. LLM cannot fabricate prices (application drops unknown schema fields and explicitly constructs payment variables from discovered candidates).
2. LLM cannot bypass budget constraints (even if it selects an over-budget candidate, the application drops it).
3. LLM cannot fabricate service IDs.
