# Phase 7 Step 2: Realtime Events

## Overview

This document describes the SSE (Server-Sent Events) event stream and the singleton `EventEmitter` architecture implemented to stream `ResearchSession` state and domain actions to the frontend.

## Architecture

The backend utilizes `ResearchEventService`, a singleton Node.js `EventEmitter` to capture and route domain events to connected clients. 
This decouples the business logic (which remains unchanged from Phase 6) from the presentation layer.

### Event Schema

All events follow a strictly safe `BaseEvent` schema:

```typescript
export interface BaseEvent {
  id: string;          // UUID for event tracking
  sessionId: string;   // The research session this belongs to
  type: string;        // Event type identifier
  timestamp: string;   // ISO 8601 UTC string
  data: any;           // Type-specific safe payload
}
```

### Endpoints

- `GET /api/v1/research/:id/stream`: Subscribes to the live event stream.
- `GET /api/v1/research/:id/citations`: Fetches historical citations.
- `GET /api/v1/research/:id/payments`: Fetches historical payments.

### Reconnect Behavior

Currently, when a client connects to `/stream`, it first receives a `session_state` event with the latest DB state, then begins listening to live events. 
Full historical replay is deferred to a future data layer upgrade, but the frontend can sync past entities using the new `/citations` and `/payments` REST endpoints.

## Domain Producers

- **ResearchStateMachine**: Emits `session_state` automatically for all validated transitions.
- **ResearchAgent**: Emits `research_failed`.
- **WebSearchTool**: Emits `citation_added`.
- **GapAnalysisService**: Emits `agent_action`.
- **ServiceDiscoveryTool**: Emits `service_discovered`.
- **ServiceEvaluationService**: Emits `service_evaluated`.
- **ProcurementService**: Emits `payment_started`, `payment_settled`, `resource_acquired`, and `approval_required`.
- **Approval Routes**: Emits `session_state` upon user rejection.

## Security & Isolation

- **Session Isolation**: The `subscribe` method listens strictly to `session:${sessionId}`. Clients connected to Session A receive absolutely no events related to Session B.
- **Payload Safety**: Event payloads are deliberately stripped of any sensitive credentials. There is zero leakage of `privateKey`, `mnemonic`, system prompts, or LLM chain-of-thought into the frontend.

## Tests & Verification

- Tested session isolation using simultaneous EventEmitter bindings.
- Verified payload structure.
- Asserted zero breakage in Phase 6 core procurement functionality.
