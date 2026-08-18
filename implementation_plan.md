# Goal Description

Implement Phase 5: Human-in-the-Loop (HITL) Procurement Approval. This phase introduces a controlled human approval workflow for purchases that exceed the user's automatic spending threshold, without altering the underlying secure payment architecture or bypassing the Policy Engine.

## Proposed Changes

### Prisma Schema (apps/api/prisma/schema.prisma)
Update the Prisma database schema to include the required fields for HITL processing.
- Add `resourceUrl`, `amount`, `asset`, `network`, `reason`, `resolvedBy`, `resolutionReason`, and `rejectedAt` to the `ApprovalRequest` model.
- Run `npx prisma db push` to synchronize SQLite.

### Payment History Repository (apps/api/src/db/PaymentHistory.ts)
- Extend the repository to expose operations for `ApprovalRequest`:
  - `createApprovalRequest(...)`
  - `getApprovalRequest(id)`
  - `updateApprovalRequest(id, data)`
- Make sure `PaymentStatus` includes `PENDING_APPROVAL`.

### Policy Engine (apps/api/src/agent/PolicyEngine.ts)
- Update `evaluate` to return `decision: 'REQUIRES_APPROVAL'` when `amount > requireApprovalAbove` (but still `<= maxPerTransaction`).
- Return `reason` indicating why it requires approval.

### Payment Tool (apps/api/src/agent/PaymentTool.ts)
- Update `fetchResource` to handle the `REQUIRES_APPROVAL` decision from the Policy Engine.
- If `REQUIRES_APPROVAL`:
  - Create a `PaymentRecord` with status `PENDING_APPROVAL`.
  - Create an `ApprovalRequest` in the DB linked to the `PaymentRecord`.
  - Suspend execution and return a structured object with `status: 'REQUIRES_APPROVAL'` and `approvalId`.
  - Ensure the SigningService is *not* called.

### Agent Tools Definition (apps/api/src/agent/tools.ts)
- Map the new `REQUIRES_APPROVAL` status gracefully to the LLM agent.
- Make sure the LLM receives the `approvalId` and `reason`.

### Agent Routes (apps/api/src/routes/agent.ts)
Add the following endpoints for the approval API:
- `GET /api/v1/agent/approvals/:approvalId`: Returns the status of the approval.
- `POST /api/v1/agent/approve/:approvalId`: 
  - Validates the approval exists and is `PENDING`.
  - Re-fetches the actual HTTP 402 requirements for the `resourceUrl`.
  - Verifies that the amount/asset/network still matches the original approval request to prevent stale approvals.
  - Updates the `ApprovalRequest` to `APPROVED`.
  - Updates the `PaymentRecord`.
  - Executes the payment via `SigningService.executeAuthorizedPayment`.
- `POST /api/v1/agent/reject/:approvalId`:
  - Validates the approval exists and is `PENDING`.
  - Marks it as `REJECTED` and logs the reason.

### Tests & Mocks (apps/api/src/agent/*.test.ts)
- Update unit tests for `PolicyEngine`, `PaymentTool`, and `tools.test.ts` to verify the new threshold and HITL suspension logic.
- Add an API test suite (`apps/api/src/routes/approvals.test.ts` or similar) to ensure stale approvals are caught and rejected approvals do not trigger signing.

## Verification Plan

### Automated Tests
- `npm run test`: All existing unit tests and the newly added state machine logic will be validated via mocked external services.
- `npm run lint` & `npm run build`: Strict typing compliance check.

### Manual Verification
- Execute a real transaction using a low `requireApprovalAbove` policy (e.g. 0.005 USDC) against the local TestNet configuration.
- Observe the LLM receiving a `REQUIRES_APPROVAL` payload.
- Trigger the rejection endpoint and verify the LLM acknowledges rejection.
- Trigger the approval endpoint and verify the transaction executes on TestNet securely.
