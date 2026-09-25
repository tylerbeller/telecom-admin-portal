---
name: api-schema
description: Regenerate and check in the OpenAPI schema after changing any backend endpoint. Use whenever controllers, request/response shapes, or validation rules change.
---

# API schema upkeep

The public API contract is checked in at `docs/api/openapi.json` and a drift
test fails CI when the served schema no longer matches it.

## Steps

1. Start the backend: `pnpm dev:backend`.
2. Regenerate: `curl -s http://localhost:8080/v3/api-docs > docs/api/openapi.json`
   (any HTTP client works; the file must be valid JSON). Then run
   `pnpm exec prettier --write docs/api/openapi.json` so the format gate
   passes; the drift test compares parsed JSON, so formatting is safe.
3. Run the drift test: `node scripts/run-backend.mjs test --tests "*ApiSchemaDriftTest"`.
4. Commit the updated schema in the same PR as the endpoint change.

## Constraints

- Do not hand-edit the schema; regenerate it. Hand edits drift from the code
  without failing the test.
- Keep the naming asymmetry: responses `snake_case`, request bodies
  `camelCase`. Both sides are typed in `hooks/*.ts`.
