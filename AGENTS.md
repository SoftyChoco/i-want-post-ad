<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-development-guardrails -->
# Project Development Guardrails (Based on Actual Decisions)

Build on these rules unless the product owner explicitly changes direction.

## 1) API Exposure and Auth Boundaries

- Keep `proxy.ts` as the global boundary for `/admin`, `/api`, and `/login`.
- Block direct API usage for non-browser clients by default (same-origin check).
- Keep explicit exceptions narrow and intentional:
  - `/api/health` for health checks.
  - `/api/internal/maintenance/*` with token auth.
- Do not weaken `DIRECT_API_BLOCKED` behavior without clear security approval.

## 2) Policy Source of Truth

- Policy (`/llms.txt`) is DB-backed, not file-backed.
- Keep automatic policy version bump enabled on each successful policy edit (`1.0.x` patch increment).
- Preserve this flow:
  - admin edits policy -> DB save -> `/llms.txt` renders DB text.
- Avoid reintroducing file fallback or static `public/llms.txt` dependencies.

## 3) Rejudge and Async LLM Flow

- Rejudge must remain asynchronous (`202 Accepted`) and non-blocking.
- Preserve `llmAttemptId` correlation guards to prevent stale overwrite races.
- Preserve `llmStatus` + `resolveLlmStatus()` semantics:
  - `processing` while running,
  - `done`/`failed` after completion,
  - UI should derive display state from resolved status, not raw fields alone.
- Keep stale-processing recovery out of read paths; use maintenance endpoint/jobs.

## 4) Lookup and Admin Throughput Controls

- Public status lookup must support both email and request code (`REQ-...`).
- Keep admin read throttling for high-volume reads:
  - `admin_lookup_read`: 15 req / 60 sec (per IP + actor key).
- Current rate-limit baselines:
  - `login`: 10 / 5 min
  - `submit`: 5 / 10 min
  - `verify`: 30 / 1 min
  - `public_lookup_contact`: 5 / 1 min
- If limits change, update tests in `lib/rate-limit.test.ts` and affected route tests.

## 5) Audit Log Privacy and Operability

- Audit log details must not expose PII (especially email addresses).
- Keep nickname-first representation in details where applicable.
- Continue masking accidental email exposure in legacy/raw detail text.
- Keep action labels localized in admin UI (e.g., `rejudge` -> `재판정`).
- Keep logs paged with conservative defaults (currently 20 per page).

## 6) Environment and Runtime Safety

- Enforce `JWT_SECRET` validity via `getJwtSecretBytes()` (min length checks).
- Keep runtime fail-closed for security misconfiguration (return 500 for invalid JWT setup).
- For production deploys, avoid auto schema changes on every start (`RUN_DB_SYNC=false` default).

## 7) Implementation Discipline for Future Work

- Add/adjust tests whenever behavior/rules change.
- Run, at minimum, after each non-trivial change:
  - diagnostics,
  - `npm test`,
  - `npm run build`.
- Prefer narrow, reversible changes over broad rewrites in this codebase.

## 8) High-Priority Next Improvements

- Add rate-limit coverage to remaining admin read-heavy routes (`/api/admin/logs` first).
- Add a small maintenance task for legacy audit-log detail cleanup (historical email removal in DB).
- Keep Next.js deprecation watch active (proxy/doc changes in future Next versions).

## 9) Complexity Control for Request Identity Context

- Treat proxy-injected actor context (`x-user-id`, `x-user-role`, `x-user-name`) as a single contract, not per-route custom parsing.
- Do not read or decode actor headers inline in routes; use shared helpers in `lib/request-actor.ts`.
- Keep header value safety centralized:
  - Encode non-ASCII user-facing values (like names) before putting them in headers at the proxy boundary.
  - Decode only in the shared helper, never ad-hoc in route files.
- When adding new admin/internal routes that need actor info, consume the same helper API instead of duplicating header logic.
- If actor context contract changes, update proxy + shared helper + affected tests together in one PR to avoid partial breakage.
<!-- END:project-development-guardrails -->
