# OpenAI Integration Audit — 25 Sep 2025

## 1. SDK & Client Configuration
- Project is on `openai@5.19.1`, which supports the Responses API, native image generation, and file operations.
- `lib/ai.ts` lazily instantiates the SDK and exposes helper utilities (model selection, reasoning-effort heuristics, SSE helpers).
- No shared abstraction yet for constructing Responses payloads, orchestrating tool calls, or streaming output (each API route reimplements this differently).
- Embedding helpers default to `text-embedding-3-small`, but other code paths still reference the legacy `text-embedding-ada-002`.

## 2. Current Usage Inventory
| Area | File(s) | Current Behaviour | Notes |
|------|---------|-------------------|-------|
| Chat endpoint | `pages/api/chat.ts` | Mixes Responses API, legacy Chat Completions-style message handling, and a bespoke image pipeline via `streamGeneratedImage`. Tool coercion and SSE plumbing repeated inline. | Needs full migration to Responses streaming helpers and native image generation fallbacks. |
| Project ask | `pages/api/projects/[id]/ask.ts` | Calls `openai.responses.create` with a concatenated string input; manual SSE heartbeat + response persistence. | Should use structured content array + shared streaming helper (or fallback to non-streaming helper). |
| Knowledge extraction | `pages/api/project-knowledge/extract.ts` | Uses Responses API for JSON extraction; manual parsing and no retries. | Needs shared helper for consistent Inputs/Outputs, error handling, and auditing. |
| File uploads | `pages/api/upload.ts`, `pages/api/documents/upload.ts` | Streams uploaded files to OpenAI (PDF/Word) and stores `openai_file_id`. Embeddings path still targets `text-embedding-ada-002`. | Update embeddings to `text-embedding-3-small` (or configurable). Consider centralising file upload logic and retries. |
| Image service | `lib/imageService.ts`, `pages/api/images/edit.ts` | Uses `openai.responses.create` for streaming generation but falls back to `openai.images.edit`. | Align with Responses image flow and consolidate streaming output handling. |
| Misc endpoints | `pages/api/chats/[id]/generate-title.ts`, `pages/api/project-knowledge/commit.ts` (indirect), etc. | Already on Responses API but lack shared helper for prompts, tool definitions, and output parsing. | Transition to new abstraction during refactor. |

## 3. Key Issues & Risks
1. **Duplicated Streaming Logic** – Each route manually handles SSE headers, heartbeats, and token forwarding. Inconsistent error handling when the client disconnects.
2. **Tool Invocation Drift** – Tool coercion logic lives inside `pages/api/chat.ts` and is inconsistent elsewhere. No central enforcement of model ↔ tool compatibility.
3. **Mixed Input Formats** – Some calls send plain strings while others send partially-structured arrays, leaving us exposed to SDK changes.
4. **Image Generation Split-Brain** – Native Responses image API is available, yet we still maintain a custom `streamGeneratedImage` flow and manual edit endpoints.
5. **Legacy Embedding Model Reference** – `text-embedding-ada-002` still appears in `pages/api/documents/upload.ts`.
6. **Lack of Retries/Backoff** – Rate-limit and transient failures are not retried consistently.
7. **Documentation Gaps** – No central runbook describing the Responses API workflow, tool registration, or migration status.

## 4. Recommended Refactor Plan

### Phase 1 – Shared Helpers & Config
1. Add `lib/ai/responses.ts` (or extend `lib/ai.ts`) with:
   - `createResponsesClient()` – wraps `openai.responses`.
   - `streamResponse({ instructions, history, userMessage, tools, sse })` – centralises streaming, tool invocation, SSE emission, logging, and retry-once logic.
   - `createResponse({ instructions, input, tools })` – non-streaming helper for background jobs (title generation, knowledge extraction).
   - Tool coercion utility leveraging `coerceEffortAndTools`.
2. Move common SSE initialisation/heartbeat + teardown into helper (`initResponseStream(res)`).
3. Expose canonical builders for:
   - Structured input arrays (system, history, user, multimodal attachments).
   - Tool definitions (built-in + custom `function` schemas).
   - Reasoning effort determination.

### Phase 2 – Endpoint Migration
1. **`pages/api/chat.ts`**
   - Replace bespoke streaming + image handling with shared helper.
   - Route image requests through native Responses image support first; fall back to `streamGeneratedImage` only when required (e.g., partial previews).
   - Centralise tool execution hooks (function calls) via a shared handler.
2. **`pages/api/projects/[id]/ask.ts`**
   - Use shared streaming helper (or non-streaming variant if API contract demands single-shot responses).
   - Persist messages using unified response object.
3. **`pages/api/project-knowledge/extract.ts`**
   - Switch to helper for JSON extraction; include structured inputs and retries.
4. **File upload/embeddings**
   - Update embedding model to `text-embedding-3-small`.
   - Factor OpenAI file upload into shared helper (optional but recommended).
5. **Image edit endpoints**
   - Evaluate migrating to Responses API `image` tools for edits, or document rationale for maintaining `openai.images.edit`.

### Phase 3 – Tooling & Documentation
1. Update `docs/` with new runbook outlining:
   - Responses API usage patterns.
   - Tool registration and execution pipeline.
   - Embedding + file upload policies.
2. Ensure `.env.example` documents any new environment flags (e.g., default models, retry toggles).
3. Expand integration tests / manual verification steps:
   - Chat streaming (text & tool calls).
  - Image generation/edit flows.
   - Project knowledge extraction.
   - File upload + embedding indexing.

## 5. Testing & Validation Checklist
- [ ] Run `npm run lint` & `npm run build`.
- [ ] Exercise `/api/chat` with text, tool calls, and image prompts (including SSE disconnect).
- [ ] Validate `/api/projects/[id]/ask` streaming output and database persistence.
- [ ] Upload documents to ensure OpenAI file IDs store correctly and embeddings use the new model.
- [ ] Execute knowledge extraction on sample chats; verify JSON commit.
- [ ] Regression-test image edit workflow (if we keep hybrid approach).

## 6. Open Questions
- Should we retire `lib/imageService.ts` once Responses image streaming meets UX requirements?
- Do we still need `streamGeneratedImage` for partial previews, or can we rely solely on Responses’ partial image events?
- How do we want to handle rate-limit retries globally (e.g., p-retry wrapper, exponential backoff, logging)?

---
Prepared by: Cline (Automated Audit)  
Date: 25 Sep 2025
