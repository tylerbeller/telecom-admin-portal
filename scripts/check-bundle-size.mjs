#!/usr/bin/env node
// Bundle-size gate. Run after `pnpm build`. Budgets are ratchets set just
// above the measured baseline (1,265 KB total / 410 KB largest chunk,
// Dec 2025): they only move down.
import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const MAX_TOTAL_KB = 1400
const MAX_CHUNK_KB = 500
const CHUNKS_DIR = join(".next", "static")

if (!existsSync(CHUNKS_DIR)) {
  console.error("No .next build output found. Run `pnpm build` first.")
  process.exit(1)
}

let total = 0
let largest = { name: "", size: 0 }

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.endsWith(".js")) continue
    const size = statSync(path).size
    total += size
    if (size > largest.size) largest = { name: entry, size }
  }
}

walk(CHUNKS_DIR)

const totalKb = total / 1024
const largestKb = largest.size / 1024
const failures = []
if (totalKb > MAX_TOTAL_KB)
  failures.push(`total client JS ${totalKb.toFixed(0)} KB > ${MAX_TOTAL_KB} KB`)
if (largestKb > MAX_CHUNK_KB)
  failures.push(`largest chunk ${largest.name} ${largestKb.toFixed(0)} KB > ${MAX_CHUNK_KB} KB`)

if (failures.length > 0) {
  console.error("Bundle-size gate failed:")
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(
  `Bundle-size gate passed: ${totalKb.toFixed(0)} KB total (budget ${MAX_TOTAL_KB}), largest chunk ${largestKb.toFixed(0)} KB (budget ${MAX_CHUNK_KB}).`
)
