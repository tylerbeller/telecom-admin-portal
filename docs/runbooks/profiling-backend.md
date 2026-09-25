# Profiling the backend

**Symptom:** the backend is slow and the metrics tell you where (via
`/actuator/metrics`) but not why. You need a CPU or allocation profile.

## JDK Flight Recorder (always available)

The backend runs on Java 21, so JFR is built in. No dependencies, safe to
attach to a live process.

```bash
# Start a 60-second profile on the running backend
jcmd <pid> JFR.start duration=60s filename=backend-profile.jfr

# Or start the backend with recording from boot
java -XX:StartFlightRecording=duration=120s,filename=backend-profile.jfr -jar backend/build/libs/telecom-demo-0.0.1-SNAPSHOT.jar
```

Find `<pid>` with `jps -l`. Open the `.jfr` file in JDK Mission Control
(`jmc`) or IntelliJ.

## What to look at first

1. **Hot methods under `org.hibernate` or `org.sqlite`**: usually a missing
   fetch join (see `FetchJoinRepositoryTest` for the pattern this repo uses to
   keep N+1 out) or a query missing an index in the Flyway migration.
2. **Lock contention on the SQLite writer**: reads fine, writes piling up.
   Cross-check with the BackendSlowWrites alert rule in `monitoring/alerts.yml`
   and the 5xx runbook.
3. **Allocation hotspots in JSON serialization**: large unpaginated
   responses. The paginated endpoints exist because of exactly this; do not
   add unpaginated ones back.

## Verify

The slow operation's metric (`http_server_requests_seconds` by uri) improves
after the fix, and the profile no longer shows the hotspot.
