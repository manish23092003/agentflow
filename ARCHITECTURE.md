# AgentFlow — Architecture

## Overview

AgentFlow is a task-aware autonomous procurement layer for AI agents. It enables an AI agent to:

1. Receive a user task
2. Perform free research
3. Identify missing information or capabilities
4. Discover relevant paid digital services
5. Evaluate price, relevance, and value
6. Apply user-defined spending policies
7. Request human approval when required
8. Pay for authorized services via x402 on Algorand
9. Receive the resource and continue the task
10. Deliver the final result with sources and a transparent expense report

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User Task                          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  LLM / AI Agent                         │
│           (free research, analysis, planning)           │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Proposed Action                        │
│         (LLM recommends: "purchase X for $Y")          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│           Procurement / Evaluation Layer                │
│     (relevance, price, expected value, alternatives)    │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│            Deterministic Policy Engine                  │
│      AUTO_APPROVE │ REQUIRE_APPROVAL │ REJECT           │
│                                                         │
│   ⚠️  SECURITY: Only this layer can authorize payments  │
│   ⚠️  The LLM CANNOT directly authorize payments       │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Human Approval (when required)             │
│   (shows: resource, price, reasoning, alternatives,    │
│    remaining budget)                                    │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  x402 Payment Layer                     │
│               (payment on Algorand)                     │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Paid Resource Acquisition                 │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Agent Continues Task                      │
│    → Final result + sources + bill + tx proof           │
└─────────────────────────────────────────────────────────┘
```

## Trust Boundaries

```
┌────────────────────────────────────────────┐
│            TRUSTED ZONE                     │
│                                             │
│  Deterministic Policy Engine                │
│  Application Logic                          │
│  Payment Authorization                      │
│  Configuration & Secrets                    │
│                                             │
├────────────────────────────────────────────┤
│         SEMI-TRUSTED ZONE                   │
│                                             │
│  LLM Output (can recommend, cannot act)     │
│  User Input (validated, authorized)         │
│                                             │
├────────────────────────────────────────────┤
│          UNTRUSTED ZONE                     │
│                                             │
│  External web content                       │
│  Third-party API responses                  │
│  Tool/plugin output                         │
│  Scraped documents                          │
│                                             │
└────────────────────────────────────────────┘
```

**Critical rule:** Data from the untrusted zone must NEVER directly trigger a payment. It must flow through the evaluation layer → policy engine → (optional) human approval before any payment is authorized.

## Project Structure

```
agentflow/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   └── api/                  # Express backend
│       ├── src/
│       │   ├── app.ts        # Express app (no listen)
│       │   ├── index.ts      # Server entry (listen)
│       │   ├── config.ts     # Centralized env config
│       │   ├── middleware/    # Request-ID, error handler
│       │   └── routes/       # Versioned API routes (/api/v1/*)
│       └── ...
├── packages/
│   └── shared/               # Shared types & logger
├── tests/                    # Integration tests (Vitest + Supertest)
├── docs/                     # Extended documentation
└── [config files]            # Root workspace, TS, ESLint, Vitest
```

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19 + Vite + TypeScript | Vanilla CSS, no component library |
| Backend | Express 4 + TypeScript | Runs via tsx (dev), tsc + node (prod) |
| Shared | TypeScript package | Types + lightweight logger |
| Monorepo | npm workspaces | Zero extra tooling |
| Testing | Vitest + Supertest | Tests import app directly |
| Linting | ESLint 9 + typescript-eslint | Flat config |

## API Versioning

All API routes are versioned:

```
/api/v1/health
/api/v1/...
```

Future breaking changes should introduce `/api/v2/` while maintaining backward compatibility on `/api/v1/` for a deprecation period.

## Current Status

### ✅ Implemented (Phase 1)
- Project structure and build system
- Health check endpoint
- Request-ID middleware
- Centralized error handling
- Structured logging
- API integration tests
- Frontend dashboard shell

### 🔲 Planned
- AI Agent orchestration layer
- Service discovery and evaluation
- Deterministic policy engine
- Human approval workflow
- x402 payment integration
- Algorand wallet and transactions
- Database layer
- Production deployment
