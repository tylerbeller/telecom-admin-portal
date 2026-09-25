# Runbooks

Operational runbooks for the telecom admin portal. Each one is written to be
executable by someone (or something) seeing this repo for the first time:
symptom, likely causes, how to confirm, what to do, how to verify.

| Runbook                                                         | Trigger                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Backend 5xx under write load](backend-5xx-under-write-load.md) | API returns HTTP 500 on writes, especially with concurrent users |
| [CI failure triage](ci-failure-triage.md)                       | A pull request goes red and the cause is not obvious             |

## Writing a new runbook

Keep the same shape: symptom, causes in order of likelihood, confirm-before-
fix steps, fix, verification, and the prevention note. A runbook that cannot
be followed cold is documentation, not a runbook.
