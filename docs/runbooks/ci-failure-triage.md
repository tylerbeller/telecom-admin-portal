# CI failure triage

**Symptom:** a pull request is red and the failing step is not self-explanatory.

## Order of operations

1. **Read the failing step's log, not the summary.** The job names match local
   commands one-to-one: Frontend is `pnpm format:check`, `pnpm lint`,
   `pnpm test:frontend:coverage`, `pnpm build`; Backend is `./gradlew
formatCheck lint test jacocoTestReport jacocoTestCoverageVerification`;
   E2E is `pnpm test:e2e`.
2. **Reproduce locally with the same command.** Every CI step maps to a local
   script. If it passes locally and fails in CI, suspect the environment, not
   the code.
3. **Environment suspects, in order of how often they bite:**
   - A tool missing from PATH (this repo's pre-commit hook once exited 127 on
     git-bash because pnpm was not on PATH; a gate that errors is a defect in
     the gate).
   - Unseeded or stale database: E2E expects seeded data, run `pnpm setup:db`.
   - Node/Java version drift: CI pins Node 22 and Java 21 (Temurin).
4. **Coverage-gate failures** name the metric and the floor. Either raise
   coverage or, with explicit reviewer sign-off, adjust the floor in the same
   PR with a note. Never adjust a floor silently.
5. **Schema drift failures** mean an endpoint changed without regenerating
   `docs/api/openapi.json`. Follow the `api-schema` skill.

## Verify

The branch is green in CI, not just locally. Local green plus CI red means the
difference between the two environments is itself the next thing to fix.

## Prevention

The devcontainer is the reference environment. When a failure reproduces in CI
but not locally twice in a row, test inside the devcontainer before debugging
the code.
