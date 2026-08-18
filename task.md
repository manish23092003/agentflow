# Phase 5 HITL Implementation Tasks

- `[x]` Update `apps/api/prisma/schema.prisma` with `ApprovalRequest` details.
- `[x]` Run `npx prisma db push` and `npx prisma generate`.
- `[x]` Update `apps/api/src/db/PaymentHistory.ts` with `ApprovalRequest` operations.
- `[x]` Update `apps/api/src/agent/PolicyEngine.ts` to support `REQUIRES_APPROVAL`.
- `[x]` Update `apps/api/src/agent/PaymentTool.ts` to suspend execution and create `ApprovalRequest`.
- `[x]` Create `apps/api/src/routes/approvals.ts` and link in `app.ts` or `agent.ts`.
- `[x]` Implement `approve` and `reject` logic with atomic transactions and stale checks.
- `[x]` Write automated tests for hitl scenarios.
- `[x]` Run manual TestNet verification (Rejection & Approval).
- `[x]` Run `npm run lint`, `npm run build`, `npm run test`.
- `[x]` Create `docs/phase-5-hitl.md` and walkthrough.
