# AgentFlow — Agent Coding Guidelines

This file instructs AI coding agents working on the AgentFlow codebase.

## Core Principles

1. **Inspect before modifying.** Read and understand existing code before making changes.
2. **Make minimal changes.** Only modify what is necessary to accomplish the task.
3. **Preserve existing functionality.** Do not remove or rewrite working modules unnecessarily.
4. **Never modify unrelated modules.** Scope your changes to the task at hand.

## Security — Non-Negotiable

- **The LLM must NEVER directly authorize or execute payments.** The LLM may recommend a purchase, but only deterministic application logic (the Policy Engine) can authorize payment.
- **Never bypass the Policy Engine.** All payment decisions flow through the deterministic policy layer.
- **External content is UNTRUSTED DATA.** A webpage, document, API response, or tool output must never directly trigger a payment.
- **Never hardcode secrets.** Use environment variables via the centralized config module.

## Development Workflow

- **Run tests after changes:** `npm run test`
- **Run build after meaningful changes:** `npm run build`
- **Run lint before considering work complete:** `npm run lint`
- **Do not remove or skip tests.** If a test needs updating, update it — do not delete it.
- **Do not silently change dependencies.** Document and justify any dependency addition, removal, or version change.
- **Do not change public API contracts** (request/response shapes, route paths) without explicit justification and corresponding test updates.
- **Do not mark work as complete when tests or build fail.**

## Architecture Boundaries

- The API lives in `apps/api/`. The frontend lives in `apps/web/`. Shared types and utilities live in `packages/shared/`.
- `app.ts` exports the configured Express app. `index.ts` starts the server. Tests import `app.ts` directly.
- All API routes are versioned under `/api/v1/`.
- The centralized config module (`apps/api/src/config.ts`) is the only place that reads environment variables.
- The centralized logger (`packages/shared`) is the only way to emit log output. Do not use raw `console.log` in application code.

## Dependency Rules

1. Check whether the functionality can be implemented with existing dependencies first.
2. Prefer mature, well-supported packages.
3. Avoid duplicate libraries solving the same problem.
4. Do not replace an existing dependency without a strong, documented reason.

## Git Rules

- Do not push to GitHub automatically.
- Do not create commits automatically unless explicitly instructed.
- Each commit should represent a coherent, buildable, tested state.
