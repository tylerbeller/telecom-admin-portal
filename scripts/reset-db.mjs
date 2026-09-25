#!/usr/bin/env node
/**
 * Cross-platform replacement for `rm -f backend/app.db && pnpm setup:db`.
 * Deletes the SQLite database (plus its WAL sidecar files, which must not
 * survive a reset) and re-seeds it with the Python seeder.
 */
import { existsSync, rmSync } from "node:fs"
import { dbPath, runSeeder } from "./seed-db.mjs"

for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (!existsSync(path)) continue
  try {
    rmSync(path)
    console.log(`Deleted ${path}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`Unable to delete ${path}. Stop the backend and try again.\n${detail}`)
    process.exit(1)
  }
}

runSeeder()
