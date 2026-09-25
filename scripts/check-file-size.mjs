#!/usr/bin/env node
// Large-file gate. Files past the line limit resist review and agent
// editing alike. The limit is a ratchet: it only moves down. Current
// baseline largest gated file: app/tickets/page.tsx at 476 lines.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const MAX_LINES = 500
const ROOTS = ["app", "components", "hooks", "lib", "e2e", "backend/src", "scripts"]
const EXTENSIONS = new Set([".ts", ".tsx", ".java", ".mjs"])
// shadcn/ui components are vendored boilerplate, same rationale as the
// coverage and duplication exclusions.
const EXCLUDED = [/components[/\\]ui[/\\]/, /check-file-size\.mjs$/]

const offenders = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === "build") continue
      walk(path)
      continue
    }
    if (!EXTENSIONS.has(extname(entry))) continue
    if (EXCLUDED.some((pattern) => pattern.test(path))) continue
    const lines = readFileSync(path, "utf8").split("\n").length
    if (lines > MAX_LINES) offenders.push({ path: relative(".", path), lines })
  }
}

for (const root of ROOTS) walk(root)

if (offenders.length > 0) {
  console.error(`Files over the ${MAX_LINES}-line gate:`)
  for (const o of offenders) console.error(`  ${o.path}: ${o.lines} lines`)
  process.exit(1)
}
console.log(`File-size gate passed (limit ${MAX_LINES} lines).`)
