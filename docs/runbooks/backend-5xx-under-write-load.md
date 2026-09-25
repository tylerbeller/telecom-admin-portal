# Backend 5xx under write load

**Symptom:** `POST`/`PUT`/`DELETE` requests return HTTP 500, clustered when
multiple users or browser tabs write at once. Reads are usually fine.

## Likely causes, in order

1. **SQLite lock contention.** The default SQLite journal mode serializes
   writers and fails fast with `SQLITE_BUSY`, which surfaces as a 500. This
   exact failure shipped here once: 208 of 1,216 writes failed in a stress
   run with two writers and three readers.
2. **A validation regression.** If failures also happen with a single writer,
   check the error envelope first: `400` with a `fields` map is validation,
   `500` is not.
3. **Missing migration.** `ddl-auto` is `none`; a new entity without a Flyway
   migration fails at query time, not startup.

## Confirm before fixing

```bash
curl -X POST http://localhost:8080/api/tickets -H "Content-Type: application/json" -d '{}'   # 400 = validation path alive
```

Then reproduce concurrency. `scripts/` has no standing stress harness; the
regression test is `e2e` plus the backend test suite. For a quick check, fire
twenty parallel `POST /api/tickets` with valid bodies and count non-201s.

## Fix

- Confirm `backend/src/main/resources/application.yaml` still carries
  `journal_mode=WAL&busy_timeout=5000` on the datasource URL. If a change
  removed or overrode it (a second connection string, a test profile), that
  is the bug. Restore it; do not "fix" it by catching the 500.
- Validation regressions: check the global exception handler and the payload
  shape against `docs/api/openapi.json`.

## Verify

The parallel-write check above returns zero 5xx, and
`pnpm test` is green.

## Prevention

The WAL/busy-timeout configuration is called out as load-bearing in
`AGENTS.md`. Treat any PR touching the datasource URL as high-risk.
