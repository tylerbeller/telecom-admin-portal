#!/usr/bin/env node
// Dead-flag gate: every flag declared in lib/flags.ts must be consumed
// somewhere else in the codebase. A flag nothing reads is worse than no
// flag, because it pretends a decision exists where none does.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const flagsSource = readFileSync("lib/flags.ts", "utf8")
const block = flagsSource.match(/export const flags = \{([\s\S]*?)\} as const/)
if (!block) {
  console.error("Could not find the flags declaration in lib/flags.ts")
  process.exit(1)
}
const declared = [...block[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1])

const ROOTS = ["app", "components", "hooks", "lib", "e2e"]
const EXTENSIONS = new Set([".ts", ".tsx"])
const used = new Set()

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue
      walk(path)
      continue
    }
    if (!EXTENSIONS.has(extname(entry))) continue
    if (path.endsWith("flags.ts")) continue
    const source = readFileSync(path, "utf8")
    for (const flag of declared) {
      if (source.includes(`flags.${flag}`)) used.add(flag)
    }
  }
}

for (const root of ROOTS) walk(root)

const dead = declared.filter((flag) => !used.has(flag))
if (dead.length > 0) {
  console.error("Declared flags with no call site:")
  for (const flag of dead) console.error(`  ${flag}`)
  console.error("Remove the flag or wire it to a real decision.")
  process.exit(1)
}
console.log(`Flag gate passed (${declared.length} declared, all consumed).`)
