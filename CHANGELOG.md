# Changelog

All notable changes to the AgentFlow project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.0.1] - 2026-08-16

### Added

- **Project foundation** — npm workspaces monorepo with `apps/api`, `apps/web`, and `packages/shared`.
- **Backend (Express)** — Health endpoint at `GET /api/v1/health` with structured JSON responses.
- **Request-ID middleware** — Supports `X-Request-ID` header; generates UUIDv4 when not provided.
- **Centralized error handler** — Structured JSON error responses with request-ID correlation.
- **Centralized logger** — Lightweight JSON-structured logging with level support (`@agentflow/shared`).
- **Centralized config** — All environment variables read in one place (`apps/api/src/config.ts`).
- **Frontend (Vite + React)** — Dashboard shell showing system status, architecture overview, development roadmap, and security principles.
- **Shared types** — `ApiResponse`, `ApiError`, `HealthResponse` types in `@agentflow/shared`.
- **Integration tests** — Vitest + Supertest tests for health endpoint, request-ID, and error handling.
- **TypeScript strict mode** across all packages.
- **ESLint 9** flat config with typescript-eslint.
- **API versioning** — All routes under `/api/v1/`.
- **Documentation** — `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPMENT_RULES.md`, `CHANGELOG.md`, `README.md`.
- **Environment template** — `.env.example` with placeholder categories.
