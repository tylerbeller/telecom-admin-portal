#!/usr/bin/env node
/**
 * Cross-platform seeder launcher. `python3` does not exist on a default Windows
 * install (the launcher is `python`/`py`), so the interpreter is resolved at
 * runtime, preferring the repo's own virtualenv.
 */
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { isAbsolute, join } from "node:path"

const scriptDir = import.meta.dirname
export const repoRoot = join(scriptDir, "..")
const backendDir = join(repoRoot, "backend")
const configuredDbPath = process.env.TELECOM_DB_PATH ?? "app.db"
export const dbPath = isAbsolute(configuredDbPath)
  ? configuredDbPath
  : join(backendDir, configuredDbPath)
const seeder = join(repoRoot, "scripts", "seed-database.py")

const candidates = [
  join(repoRoot, ".venv", "Scripts", "python.exe"),
  join(repoRoot, ".venv", "bin", "python"),
]

export function runSeeder() {
  const venvPython = candidates.find((path) => existsSync(path)) ?? null
  spawnSeeder(venvPython ?? "python3")
}

function spawnSeeder(command) {
  const child = spawn(command, [seeder], { cwd: repoRoot, stdio: "inherit" })
  child.on("error", () => {
    if (command === "python3") {
      spawnSeeder("python")
    } else if (command === "python") {
      spawnSeeder("py")
    } else {
      console.error(
        "Python 3 is required to seed the database (python3/python/py on PATH, or a .venv in the repo)"
      )
      process.exit(1)
    }
  })
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  runSeeder()
}
