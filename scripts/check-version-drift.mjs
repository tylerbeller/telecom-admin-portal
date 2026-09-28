#!/usr/bin/env node
// Cross-module version-drift gate. The frontend and backend ship together,
// so their versions must agree; a drift here means the artifacts no longer
// describe the same release. Both sides declare the version in their own
// build file, so this is the only place the two are compared.
import { readFileSync } from "node:fs"

function stripBuildMetadata(version) {
  // Trailing -SNAPSHOT / +build identifiers do not describe the release line.
  return version.split(/[-+]/)[0].trim()
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const gradle = readFileSync("backend/build.gradle", "utf8")

const match = gradle.match(/^\s*version\s*=\s*['"]([^'"]+)['"]/m)
if (!match) {
  console.error("Could not find a version declaration in backend/build.gradle")
  process.exit(1)
}

const frontend = stripBuildMetadata(pkg.version)
const backend = stripBuildMetadata(match[1])

if (frontend !== backend) {
  console.error("Version drift between applications:")
  console.error(`  package.json          ${pkg.version} (${frontend})`)
  console.error(`  backend/build.gradle  ${match[1]} (${backend})`)
  console.error("Align both versions before releasing.")
  process.exit(1)
}

console.log(`Version-drift gate passed (frontend and backend both ${frontend}).`)
