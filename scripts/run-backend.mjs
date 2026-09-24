#!/usr/bin/env node
/**
 * Cross-platform backend launcher. Replaces shell-only package.json scripts
 * (`cd backend && ./gradlew bootRun`, `cd backend && java -jar build/libs/*.jar`)
 * that break on Windows, where cmd cannot execute `./gradlew` or expand globs.
 */
import { spawn } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
import { basename, join } from "node:path"

const scriptDir = import.meta.dirname
const repoRoot = join(scriptDir, "..")
const backendDir = join(repoRoot, "backend")
const mode = process.argv[2] ?? "bootRun"

function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, "bin", "java.exe"))) {
    return process.env.JAVA_HOME
  }

  if (process.platform !== "win32") {
    return null
  }

  const roots = [
    join(process.env.LOCALAPPDATA ?? "", "Programs", "Java"),
    join(process.env.ProgramFiles ?? "", "Java"),
    join(process.env.ProgramFiles ?? "", "Eclipse Adoptium"),
  ].filter(Boolean)

  const candidates = roots.flatMap((root) => {
    if (!existsSync(root)) return []
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^jdk/i.test(entry.name))
      .map((entry) => join(root, entry.name))
  })

  const version = (candidate) => {
    const name = basename(candidate)
    const legacy = name.match(/^(?:jdk|jre)[-_]?1\.(\d+)/i)
    const modern = name.match(/^(?:jdk|jre)[-_]?(\d+)/i)
    return Number(legacy?.[1] ?? modern?.[1] ?? 0)
  }

  return (
    candidates
      .filter((candidate) => existsSync(join(candidate, "bin", "java.exe")))
      .sort((left, right) => version(right) - version(left) || right.localeCompare(left))
      .at(0) ?? null
  )
}

function run(command, args, { cwd = backendDir, env = process.env } = {}) {
  // Windows cannot spawn .bat/.cmd files directly without a shell.
  const needsShell = process.platform === "win32" && /\.(bat|cmd)$/i.test(command)
  const options = { cwd, env, stdio: "inherit" }
  const child = needsShell
    ? spawn(`"${command}" ${args.join(" ")}`, { ...options, shell: true })
    : spawn(command, args, options)
  child.on("error", (err) => {
    console.error(err)
    process.exit(1)
  })
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)))
}

const javaHome = findJavaHome()
const environment = javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env

if (mode === "jar") {
  const libsDir = join(backendDir, "build", "libs")
  if (!existsSync(libsDir)) {
    console.error("No backend build found. Run `pnpm build:backend` first.")
    process.exit(1)
  }
  const jars = readdirSync(libsDir)
    .filter((name) => name.endsWith(".jar") && !name.endsWith("-sources.jar"))
    .sort()
  const jar = jars.at(-1)
  if (!jar) {
    console.error("No jar found in backend/build/libs. Run `pnpm build:backend` first.")
    process.exit(1)
  }
  const javaCommand =
    javaHome && process.platform === "win32" ? join(javaHome, "bin", "java.exe") : "java"
  run(javaCommand, ["-jar", join("build", "libs", jar)], { env: environment })
} else {
  const wrapper =
    process.platform === "win32" ? join(backendDir, "gradlew.bat") : join(backendDir, "gradlew")
  if (!existsSync(wrapper)) {
    console.error(`Gradle wrapper not found: ${wrapper}`)
    process.exit(1)
  }
  run(wrapper, [mode, ...process.argv.slice(3)], { env: environment })
}
