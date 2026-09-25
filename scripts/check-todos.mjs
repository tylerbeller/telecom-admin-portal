#!/usr/bin/env node
// Tech-debt gate. Debt markers are allowed, but only when they reference a
// tracked issue: TODO(#123), FIXME(#123), HACK(#123). Bare markers are
// invisible debt and fail the gate.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative } from "node:path"

const ROOTS = ["app", "components", "hooks", "lib", "e2e", "backend/src", "scripts"]
const EXTENSIONS = new Set([".ts", ".tsx", ".java", ".mjs", ".py"])
const EXCLUDED = [/components[/\\]ui[/\\]/, /check-todos\.mjs$/]
const MARKER = /\b(TODO|FIXME|HACK|XXX)\b/
const TRACKED = /\b(TODO|FIXME|HACK|XXX)\(#\d+\)/

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
    readFileSync(path, "utf8")
      .split("\n")
      .forEach((line, index) => {
        if (MARKER.test(line) && !TRACKED.test(line)) {
          offenders.push({ path: relative(".", path), line: index + 1 })
        }
      })
  }
}

for (const root of ROOTS) walk(root)

if (offenders.length > 0) {
  console.error("Debt markers without an issue reference:")
  for (const o of offenders) console.error(`  ${o.path}:${o.line}`)
  console.error("Reference a tracked issue, e.g. TODO(#123).")
  process.exit(1)
}
console.log("Tech-debt gate passed: every marker references a tracked issue.")
