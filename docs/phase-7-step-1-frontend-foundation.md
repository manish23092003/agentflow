# Phase 7 Step 1: Frontend Foundation

## Design Philosophy
The AgentFlow frontend is designed as a premium, professional research operations platform. It completely eschews generic "AI demo" aesthetics (neon glows, excessive gradients, glassmorphism) in favor of a restrained, high-contrast, data-dense interface.

## Visual System
- **Colors**: Uses a highly restrained palette mapping directly to semantic states (info, success, warning, danger). Backgrounds use distinct surface and elevated surface colors for structure.
- **Typography**: Inter for standard UI components and JetBrains Mono for system-level cryptographic identifiers and raw outputs.
- **Micro-interactions**: Uses precise, 150ms state changes and constrained spinning/pulsing specifically to indicate active background operations. 

## Tokens & Styling
Instead of introducing a massive external framework, we extended the base styles with pure CSS tokens inside `apps/web/src/index.css`. This ensures absolute control over the AgentFlow visual identity while keeping the bundle size microscopic.
Lightweight utilities (`utilities.css`) and modular UI components (`components/ui`) map directly to these variables.

## Routing
Implemented with `react-router-dom` using a structured App Shell pattern.
- `/` - Dashboard
- `/research/new` - Session Initialization
- `/research/:id` - Active/Completed Workspace
- `/history` - Research History
- `/approvals` - Human-In-The-Loop Approval Queue
- `/payments` - Cryptographic Ledger

## State Presentation
The `ResearchState` enum drives the entire frontend. To prevent state interpretation logic from scattering, a centralized mapping exists in `utils/statePresentation.ts`. Every state possesses a defined label, semantic tone, specific icon, and explicit description.

## API Boundary
A unified, fully-typed API client wrapper handles all network communication (`lib/api.ts`). It only exposes exact endpoints necessary for reading state and submitting HITL decisions. It contains **zero** logic regarding keys, mnemonics, or blockchain network semantics.

## Accessibility
- Proper focus rings (`focus-visible:ring-2 focus-visible:ring-info`).
- Support for `prefers-reduced-motion` to disable animations.
- Accessible ARIA structures inside core primitives.

## Responsive Strategy
Leveraged CSS Flexbox and Grid layouts designed mobile-first but optimized for wide, data-heavy desktop viewports. The shell locks standard height on desktop to prevent full-page scroll, prioritizing internal panel scroll instead.
