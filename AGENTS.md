# AGENTS.md: working in this repo

This file is the contract between this repository and any agent (human or
otherwise) doing work in it. Read it before touching code. CI checks that it
exists and stays non-trivial.

## What this is

A telecom admin portal used by a mobile operator's staff to manage
subscribers, plans, devices, usage records, and support tickets. Next.js 16
frontend at the repo root, Spring Boot 4 API in `backend/`, SQLite behind
Flyway migrations. Demo data only; never put real customer data anywhere near
it.

## Setup

```bash
pnpm setup    # install deps and seed the database (python seeder, see README)
```

Node 22+, Java 21+, pnpm 10. A devcontainer is provided and is the reference
environment: if it works there and breaks on your machine, your machine is
wrong.

## Run, test, verify

```bash
pnpm dev              # frontend :3000, backend :8080
pnpm test             # frontend (vitest) + backend (gradle) unit tests
pnpm test:e2e         # Playwright, needs the seeded DB
pnpm lint:all         # eslint + tsc + spotbugs + pmd
pnpm format:check     # prettier + spotless
pnpm check:dup        # jscpd duplicate-code gate
pnpm check:deps       # knip dead-dependency gate
pnpm check:filesize   # large-file ratchet
pnpm check:todos      # debt markers must reference an issue: TODO(#123)
pnpm check:agents     # this file's documented commands must exist
pnpm build && pnpm check:bundle   # bundle-size ratchet
```

The full local gate before opening a PR is all of the above. CI runs the same
commands; do not open a PR on hope.

## Non-negotiables

1. **Every fix ships with a failing-first test.** Three production defects in
   this repo's history were invisible to a green suite. If there is no test
   that fails without your change, you are not done.
2. **Run the software, not just the suite.** Green tests have lied here
   before. For behavior changes, drive the running app (Playwright or manual)
   and look at what happens.
3. **Respect the API naming asymmetry on purpose.** Responses are
   `snake_case`, request bodies are `camelCase`. Do not "fix" one side; both
   are typed in `hooks/*.ts`.
4. **SQLite pragmas are load-bearing.** WAL mode and `busy_timeout` in
   `application.yaml` are the fix for concurrent-write 500s. Do not remove
   them, and do not bypass them with a different connection string.
5. **Never weaken a gate to make it pass.** Not coverage floors, not hooks,
   not lint. Fix the cause or open the PR without the change.

## Where things live

See the README's project-structure table. API schema is checked in at
`docs/api/openapi.json` and enforced by a drift test; regenerate it with the
backend running (`curl localhost:8080/v3/api-docs`) and commit the result.
Runbooks live in `docs/runbooks/`.
