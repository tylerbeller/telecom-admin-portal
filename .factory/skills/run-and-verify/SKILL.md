---
name: run-and-verify
description: Start the telecom portal, run its full local gate, and verify behavior against the running app. Use before opening any PR, or whenever a change touches runtime behavior.
---

# Run and verify

The rule in this repo: green tests are necessary and not sufficient. Three
production defects here were invisible to a passing suite, so behavior changes
are verified against the running application.

## Steps

1. Seed the database if `backend/app.db` is missing or stale: `pnpm setup:db`.
2. Start both services: `pnpm dev` (frontend :3000, backend :8080). Backend
   health: `GET http://localhost:8080/api/health`.
3. Run the static gates: `pnpm lint:all`, `pnpm format:check`,
   `pnpm check:dup`, `pnpm check:deps`.
4. Run the suites: `pnpm test` (unit), `pnpm test:e2e` (Playwright).
5. For behavior changes, drive the running app through the affected flow and
   capture evidence (screenshot, request/response, or Playwright trace).
   State in the PR what you observed, not what you assume.

## Constraints

- Never weaken a gate (coverage floor, hook, lint rule) to make a change pass.
- If a gate errors instead of passing or failing (a hook exiting 127, a tool
  missing from PATH), treat the error itself as the defect and fix that first.
- SQLite pragmas in `application.yaml` (WAL, busy_timeout) are load-bearing.
