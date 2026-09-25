#!/usr/bin/env node
// AGENTS.md validation. The contract's value is that its commands work; this
// gate fails when AGENTS.md documents a pnpm script that no longer exists,
// so the file cannot quietly rot.
import { readFileSync } from "node:fs"

const agents = readFileSync("AGENTS.md", "utf8")
const pkg = JSON.parse(readFileSync("package.json", "utf8"))

// pnpm subcommands that are not repo scripts.
const BUILTINS = new Set(["install", "exec", "add", "remove", "update", "run", "dlx", "create"])

const documented = new Set()
for (const match of agents.matchAll(/\bpnpm ([a-z][a-z0-9:-]*)\b/g)) {
  if (!BUILTINS.has(match[1])) documented.add(match[1])
}

const missing = [...documented].filter((script) => !(script in (pkg.scripts ?? {})))

if (missing.length > 0) {
  console.error("AGENTS.md documents commands missing from package.json:")
  for (const script of missing) console.error(`  pnpm ${script}`)
  process.exit(1)
}
console.log(`AGENTS.md validation passed (${documented.size} documented commands all exist).`)
