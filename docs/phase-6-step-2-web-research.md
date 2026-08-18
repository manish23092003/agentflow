# Phase 6 Step 2: Real Web Search + Citation Persistence

## Provider Architecture
The web search functionality is abstracted behind a generic `WebSearchProvider` interface (`apps/api/src/research/types.ts`). This allows seamless swapping between real APIs and deterministically mockable providers for testing.
- **TavilySearchProvider**: Connects to the real Tavily Search API. Returns structured and normalized data in the `SearchResult` interface.
- **MockSearchProvider**: A deterministic fixture provider that returns statically mock results. Used in automated tests to prevent brittle network dependencies.

## Tavily Integration & Security
- `TAVILY_API_KEY` has been safely added to `.env.example` and `config.ts`.
- The real API key is strictly backend-only. It is never exposed in the LLM prompt, tool arguments, or database logs.

## WebSearchTool
- `WebSearchTool` (`apps/api/src/research/tools/WebSearchTool.ts`) encapsulates the provider call and automatically persists the gathered citations to the database.
- The tool's execution is strictly governed by the `ResearchStateMachine`. It enforces that free web searching is only available when `ResearchSession.status === 'RESEARCHING_FREE'`. Execution will cleanly fail with an error object if attempted in an unauthorized state (e.g. `PAID_DISCOVERY`).

## Citation Model & Persistence
- Every time the `WebSearchTool` performs a successful query and yields results to Gemini, citations are instantly recorded to the database using `ResearchRepository`.
- To prevent duplicate clutter during iterative searches, a de-duplication check is enforced based on `researchSessionId` and `url`.
- Citation metadata includes `url`, `title`, `snippet`, `sourceType = 'WEB_SEARCH'`, and the `provider`.

## Free-First State Management
- `POST /api/v1/research/start` initializes a `ResearchSession` with the state `CREATED`, and automatically transitions it to `RESEARCHING_FREE`.
- The `ResearchAgent` spins up Gemini 1.5 Pro to exhaustively explore the goal using the `WebSearchTool`.
- External web snippets are passed into the LLM context, but treated strictly as untrusted data. This content cannot bypass the orchestrator to authorize payment or mutate policy constraints.
- Upon LLM completion, the state accurately transitions to `FREE_RESEARCH_COMPLETE`.

## Manual Verification
For manual verification, the required infrastructure is complete. Follow these steps:
1. Copy `.env.example` to `.env` and set a valid `TAVILY_API_KEY`.
2. Run the provided manual verification script:
   ```bash
   npx tsx apps/api/src/research/manual-test.ts
   ```
3. You will observe the session enter `RESEARCHING_FREE`, execute the web search, persist citations, and eventually transition to `FREE_RESEARCH_COMPLETE`.

## Limitations & Next Steps
- Free research context is gathered, but currently, LLM intermediate thought synthesis is dropped at the end of the step since we haven't integrated the persistent `Message` thread.
- Paid Service Discovery and gap analysis are disabled in this step and will be enabled in Phase 6 Step 3.

## Vercel AI SDK Tool-Calling Fix
During initial verification, a silent failure occurred where `WebSearchTool` was not executed and 0 citations were persisted, resulting in a `NO_CITATIONS_PERSISTED` execution error.

**Root Cause:**
Direct Google Gemini REST API requests confirmed that the `gemini-3.6-flash` model correctly returns the tool call execution. However, the model includes new experimental schema elements (`thoughtSignature` and an inline `id`). The outdated Vercel AI SDK strictly flagged the perfectly valid `functionCall` as `MALFORMED_FUNCTION_CALL` and silently returned 0 tool calls.

**SDK Versions Before Fix:**
- `ai`: `3.4.33`
- `@ai-sdk/google`: `4.0.44`
- `zod`: `3.25.76` / Invalid `4.4.3` peer resolution

**SDK Versions After Fix:**
- `ai`: `7.0.66` (Latest)
- `@ai-sdk/google`: `4.0.44` (Latest compatible)
- `zod`: `4.4.3` (Latest stable)

**Minimal Tool-Calling Verification:**
A diagnostic script `debug-gemini-tool.ts` utilizing `pingTool` was written to confirm native Google execution vs Vercel AI SDK execution. Upon upgrading to `ai@7.0.66`, both `toolChoice: 'auto'` and `toolChoice: { type: 'tool', toolName: 'pingTool' }` successfully yielded valid parsed `toolCalls`.

**Real Gemini + Tavily Verification:**
After applying the SDK fix, `apps/api/src/research/manual-test.ts` was successfully executed:
- Gemini accurately detected the need for the `webSearchTool` and emitted the query: `"Indian IT industry AI hiring trends 2026"`.
- `WebSearchTool.execute()` correctly received the structured argument.
- `TavilySearchProvider.search()` successfully fired and retrieved 5 high-relevance web documents.
- `ResearchRepository` seamlessly persisted all 5 citations.
- The `ResearchSession` state completed cleanly to `FREE_RESEARCH_COMPLETE`.
