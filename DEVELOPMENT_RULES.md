# AgentFlow — Development Rules

## Git & Checkpoints

- Each commit must represent a coherent, buildable, tested state.
- Write descriptive commit messages: `type(scope): description` (e.g., `feat(api): add service discovery endpoint`).
- Do not commit broken builds or failing tests.
- Do not push to GitHub automatically.
- Create feature branches for non-trivial changes.

## Testing

- Every new API endpoint must have corresponding integration tests.
- Tests must pass before any PR is merged: `npm run test`.
- API tests use Supertest against the imported Express app — no running server required.
- Do not delete or skip existing tests. If behavior changes, update the tests.
- Test both success and error paths.
- Include request-ID propagation in API tests.

## Dependency Management

- Before adding a dependency, verify the functionality cannot be achieved with existing packages.
- Prefer mature, actively maintained packages with minimal transitive dependencies.
- Do not install duplicate libraries that solve the same problem.
- Do not replace an existing dependency without a documented, justified reason.
- Pin major versions with `^` ranges (e.g., `^4.21.0`).
- Run `npm audit` periodically and address vulnerabilities.

## API Compatibility

- All routes are versioned under `/api/v1/`.
- Do not change existing response shapes without updating the version prefix.
- Breaking API changes require a new version (`/api/v2/`) and a deprecation notice on the old version.
- Document new endpoints in ARCHITECTURE.md.

## Security

- **LLM cannot authorize payments.** Only deterministic application logic (Policy Engine) controls payment execution.
- **External content is untrusted.** Web content, API responses, tool outputs must never directly trigger a payment.
- Never hardcode secrets. Use `.env` files (excluded from git) and the centralized config module.
- Validate and sanitize all user input at the API boundary.
- Apply the principle of least privilege in all service interactions.
- Payment-related code changes require extra review and testing — document the security implications.

## Database Migrations (future)

- All schema changes must use versioned migration files.
- Migrations must be reversible (include both `up` and `down`).
- Never modify an already-applied migration — create a new one.
- Test migrations against a clean database before merging.

## Environment Variables

- All environment variables are read in `apps/api/src/config.ts` — nowhere else.
- New variables must be added to both `config.ts` and `.env.example`.
- Never commit real secrets. `.env` is excluded from git.
- Use sensible defaults for development mode.

## Logging

- Use the centralized logger from `@agentflow/shared` — do not use raw `console.log` in application code.
- Include `requestId` in all request-scoped log entries.
- Use appropriate log levels: `debug` for development detail, `info` for operational events, `warn` for recoverable issues, `error` for failures.
- Log entries are JSON-structured for machine parsing.

## Error Handling

- API errors return the standard `ApiResponse` envelope with `success: false` and a structured `error` object.
- Include the `requestId` in error responses.
- Use the centralized error handler middleware — do not handle errors ad-hoc in routes.
- Never expose stack traces or internal details in production error responses.
- Log full error details (including stack) server-side.

## Payment-Related Code (future)

- All payment logic must flow through the deterministic Policy Engine.
- Payment code changes require explicit documentation of security implications.
- Never allow LLM output to directly invoke payment functions.
- Test payment flows with both mock and testnet configurations before mainnet.
- Log all payment attempts, approvals, rejections, and completions with full audit context.
