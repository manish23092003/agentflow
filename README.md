# AgentFlow

**Autonomous procurement layer for AI agents using x402 on Algorand.**

---

## Vision

AgentFlow enables AI agents to autonomously discover, evaluate, and pay for digital services while maintaining transparent human oversight and deterministic spending controls.

An AI agent receives a user task, performs free research, identifies gaps, discovers relevant paid services, evaluates price and value, applies spending policies, requests approval when needed, pays via x402 on Algorand, and delivers results with full source attribution and an expense report.

## Flagship Use Case

**Autonomous Research** — An AI agent conducts research on a topic. When free sources are insufficient, it identifies paid resources (premium APIs, databases, reports), evaluates their cost against expected value, and — with policy approval — procures them to deliver a comprehensive result.

## Architecture

```
User Task → LLM Research → Procurement → Policy Engine → Approval → x402 Payment → Algorand → Result
```

**Critical security invariant:** The LLM can *recommend* purchases but **cannot authorize payments**. Only the deterministic Policy Engine controls payment execution. External content is always treated as untrusted data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete architecture documentation.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Express 4 + TypeScript |
| Shared | TypeScript types + structured logger |
| Monorepo | npm workspaces |
| Testing | Vitest + Supertest |
| Payments | x402 on Algorand *(planned)* |

## Current Status

| Component | Status |
|-----------|--------|
| Project structure & build system | ✅ Complete |
| Health check API | ✅ Complete |
| Request-ID + error handling | ✅ Complete |
| Structured logging | ✅ Complete |
| Dashboard shell | ✅ Complete |
| Integration tests | ✅ Complete |
| AI agent orchestration | 🔲 Planned |
| Service discovery | 🔲 Planned |
| Policy engine | 🔲 Planned |
| Human approval workflow | 🔲 Planned |
| x402 payment integration | 🔲 Planned |
| Algorand wallet/transactions | 🔲 Planned |
| Database layer | 🔲 Planned |
| Production deployment | 🔲 Planned |

## Local Development

### Prerequisites

- Node.js ≥ 22
- npm ≥ 10

### Setup

```bash
# Install dependencies
npm install

# Start development servers (API + frontend)
npm run dev
```

The API starts at `http://localhost:3001` and the frontend at `http://localhost:5173`.
The frontend proxies `/api/*` requests to the backend automatically.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API and frontend in dev mode |
| `npm run build` | Build all packages for production |
| `npm run test` | Run integration tests |
| `npm run lint` | Lint all TypeScript files |
| `npm run typecheck` | Type-check without emitting |

### Verify Installation

```bash
# Build and test
npm run build
npm run test

# Check health endpoint
curl http://localhost:3001/api/v1/health
```

## Project Structure

```
agentflow/
├── apps/
│   ├── web/            # React frontend
│   └── api/            # Express backend
├── packages/
│   └── shared/         # Shared types & logger
├── tests/              # Integration tests
├── docs/               # Extended documentation
├── AGENTS.md           # AI agent coding guidelines
├── ARCHITECTURE.md     # System architecture
├── DEVELOPMENT_RULES.md # Development conventions
└── CHANGELOG.md        # Version history
```

## Contributing

See [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for coding conventions, testing requirements, and security policies.

## License

[MIT](LICENSE)
