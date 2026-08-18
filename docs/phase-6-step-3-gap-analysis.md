# Phase 6 Step 3: Gap Analysis & Free-First Enforcement

## Overview
This step implements the `GapAnalysisService` and the `ResearchGap` database model to evaluate whether the initial free web research adequately satisfied the user's goal. It strictly enforces Free-First security rules by completely isolating paid tool discovery until the orchestrator explicitly grants access based on validated gaps.

## Data Model
A `ResearchGap` model was added to Prisma:
- `id`: UUID
- `researchSessionId`: String (relation)
- `hasMaterialGap`: Boolean
- `missingInformation`: String (JSON)
- `importance`: String (LOW | MEDIUM | HIGH)
- `evidenceSummary`: String
- `recommendedAction`: String (CONTINUE_FREE | DISCOVER_PAID)
- `evidenceCitationIds`: String (JSON)
- `createdAt`: DateTime

## State Transitions
The `ResearchStateMachine` was upgraded to centralize all state mutations via `transition(repo, sessionId, currentState, nextState)`.

Transitions out of `EVALUATING_GAPS`:
1. **No material gap** (`hasMaterialGap = false`) → `SYNTHESIZING`
2. **Material gap with LOW importance** → `SYNTHESIZING`
3. **Material gap with HIGH/MEDIUM importance** → `PAID_DISCOVERY`
4. **Validation/API failure** → `FAILED`

## Evidence Grounding
Gap Analysis prevents LLM hallucination:
- The `generateObject` prompt demands gap reasoning strictly from persisted citations.
- The service performs validation ensuring every citation ID returned by the model actually exists in the `ResearchSession`'s citations.
- If invalid IDs are found, the session transitions to `FAILED`.

## Security Boundaries
- **ServiceDiscoveryTool**: Remains gated. Only unlocked when `ResearchStateMachine.isToolAllowed` evaluates to `true` during `PAID_DISCOVERY` or `ALTERNATIVE_DISCOVERY`.
- **PaymentTool**: Remains strictly locked to `SERVICE_EVALUATION`.
- **x402 Integration**: untouched in this step.

## Test Outcomes
- 10+ new unit tests verify `GapAnalysisService` behavior across edge cases.
- 59 total tests pass with no regressions.
- Lint and build execute flawlessly.

## Manual Verification
Two controlled scenarios successfully ran and demonstrated the behavior.

1. **Scenario A (No Gap)**
   - Goal: Summarize the basic benefits of cloud computing.
   - Result: LLM recognized evidence as sufficient.
   - Final State: `SYNTHESIZING`

2. **Scenario B (Material Gap)**
   - Goal: Quantitative impact of AI on hiring in the Indian IT industry in 2026.
   - Result: LLM recognized missing quantitative data from public citations.
   - Final State: `PAID_DISCOVERY`
