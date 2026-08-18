# Phase 5: Human-in-the-Loop (HITL) Procurement Approval

Phase 5 introduced a controlled human approval workflow for purchases that exceed the AI Agent's automatic spending threshold, enforcing secure, state-machine-driven procurement operations.

## Key Principles

- **No Agent Bypassing**: The AI Agent is physically disconnected from the `SigningService` if `PolicyEngine` determines an approval is required.
- **Immutable Requirements**: Approval can only be granted on the exact HTTP 402 requirements of the resource. Stale prices immediately invalidate approvals.
- **Stateless Agent Workflow**: The AI Agent receives a `REQUIRES_APPROVAL` rejection and must wait for human intervention. It cannot trigger an approval itself.

## Database Additions (SQLite via Prisma)

A new `ApprovalRequest` model was introduced and is strictly linked to `PaymentRecord`:

```prisma
model ApprovalRequest {
  id                   String   @id @default(uuid())
  paymentRecordId      String   @unique
  status               String   // PENDING | APPROVED | REJECTED | EXPIRED | CANCELLED
  resourceUrl          String
  amount               Int
  asset                String
  network              String
  payTo                String
  reason               String
  requestedAt          DateTime @default(now())
  expiresAt            DateTime
  approvedAt           DateTime?
  rejectedAt           DateTime?
  resolvedBy           String?
  resolutionReason     String?
}
```

## Approval State Machine

1. **PENDING**: Initial state created when `amount > requireApprovalAbove`. AI Agent is suspended.
2. **APPROVED**: User approved the transaction, HTTP 402 requirements match, and `SigningService` successfully executed the transaction.
3. **REJECTED**: User explicitly denied the transaction.
4. **EXPIRED**: The request exceeded the 1-hour expiration timeframe.
5. **CANCELLED**: The HTTP 402 resource requirements (price, asset, network, payTo) changed since the approval was requested.

## API Endpoints

### 1. `GET /api/v1/agent/approvals/:approvalId`
Returns the status of an approval request.

### 2. `POST /api/v1/agent/reject/:approvalId`
Marks the request as `REJECTED`. The agent will be informed in its next tick, allowing it to seek alternatives. Does **not** trigger `SigningService`.

### 3. `POST /api/v1/agent/approve/:approvalId`
1. Re-fetches the actual `resourceUrl`.
2. Verifies the HTTP 402 metadata matches the `ApprovalRequest` precisely.
3. Overrides the `PolicyEngine` decision to `APPROVED` and securely invokes `SigningService.executeAuthorizedPayment`.
4. Executes real TestNet x402 payment.

## Security Controls Implemented

- **Stale Approval Prevention**: A 200 HTTP response instead of 402, or a changed asset ID/network/price causes an immediate `CANCELLED` status.
- **Atomic Operations**: Prisma handles the status transition (`status: 'PENDING' -> 'APPROVED'`) atomically to prevent duplicate or race-condition payments.
- **Input Sanitization**: The Approve endpoint derives all its payload strictly from the persisted database row, never trusting arbitrary client payloads for amounts or destination addresses.

## TestNet Demonstration

A manual end-to-end Algorand TestNet demonstration was performed with the following policy constraint: `requireApprovalAbove: 5000` (0.005 USDC).

- **Task**: Fetch a 0.01 USDC resource.
- **Rejection Scenario**: Human operator called `/reject/:approvalId`. Zero blockchain transactions occurred.
- **Approval Scenario**: Human operator called `/approve/:approvalId`. The Algorand TestNet transaction was broadcast securely via `SigningService`, the resource returned `HTTP 200 OK`, and the DB status updated to `SUCCESS`.

### Verification Proofs

1. **Real Approval Transaction Proof**:
   - The manual E2E test confirmed the transaction via `POST /api/v1/agent/approve/:approvalId`.
   - The system re-evaluated `PolicyEngine`, verified the 402 requirement, and returned `status: 'SUCCESS'`. The x402 server logs confirmed receiving the payment and returning `HTTP 200`.

2. **Rejection Proof**:
   - The manual E2E test called `POST /api/v1/agent/reject/:approvalId`.
   - Result: `status: 'REJECTED'`. The `SigningService` was never executed, leaving `PaymentRecord` without a `transactionId`, ensuring zero funds were spent.

3. **Stale Approval Proof**:
   - Proven by automated test: `invalidates approval if price is stale`.
   - Simulates a 402 resource altering its required amount or asset ID after `PENDING` approval. The endpoint immediately cancels the request with `CANCELLED` and `Payment requirements changed`.

4. **Race Condition Proof**:
   - Proven by automated test: `prevents race conditions with simultaneous approvals`.
   - Fires two identical `/approve` requests simultaneously. Prisma's `updateMany` guarantees atomic transitions. One request succeeds (`HTTP 200`), while the other fails with `HTTP 409 Conflict: Race condition: Approval request no longer pending`.

5. **Migration Status**:
   - A dedicated Prisma migration `20260818131200_hitl_approval` was securely generated and tracked in `apps/api/prisma/migrations/`.
   - The SQLite database is safely migrated with the new `ApprovalRequest` schema.
