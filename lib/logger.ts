const isDev = process.env.NODE_ENV === "development"

// Log scrubbing: known PII-ish field names are replaced wholesale, and
// string values are scrubbed for email-shaped and long-number-shaped runs
// (the demo dataset is synthetic, but the habit is load-bearing; see
// docs/privacy.md).
const SENSITIVE_KEY =
  /email|phone|sim|address|ssn|pass(word)?|token|secret|authorization|api[-_]?key/i
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const LONG_NUMBER_PATTERN = /\b\d{12,}\b/g

function redact(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return "[redacted]"
  if (typeof value === "string") {
    return value
      .replace(EMAIL_PATTERN, "[redacted-email]")
      .replace(LONG_NUMBER_PATTERN, "[redacted-number]")
  }
  if (Array.isArray(value)) return value.map((item) => redact(item))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]))
  }
  return value
}

type LogLevel = "debug" | "info" | "warn" | "error"

interface Logger {
  debug: (obj: object, msg?: string) => void
  info: (obj: object, msg?: string) => void
  warn: (obj: object, msg?: string) => void
  error: (obj: object, msg?: string) => void
  child: (bindings: object) => Logger
}

function createBrowserLogger(context?: string): Logger {
  const prefix = context ? `[${context}]` : ""

  const log = (level: LogLevel, obj: object, msg?: string) => {
    const scrubbedMsg = typeof msg === "string" ? (redact(msg) as string) : msg
    const output = redact(scrubbedMsg ? { ...obj, msg: scrubbedMsg } : obj) as object
    const prefixedMsg = prefix ? `${prefix} ${scrubbedMsg || ""}` : scrubbedMsg
    switch (level) {
      case "debug":
        if (isDev) console.debug(prefixedMsg, output)
        break
      case "info":
        if (isDev) console.info(prefixedMsg, output)
        break
      case "warn":
        console.warn(prefixedMsg, output)
        break
      case "error":
        console.error(prefixedMsg, output)
        break
    }
  }

  return {
    debug: (obj: object, msg?: string) => log("debug", obj, msg),
    info: (obj: object, msg?: string) => log("info", obj, msg),
    warn: (obj: object, msg?: string) => log("warn", obj, msg),
    error: (obj: object, msg?: string) => log("error", obj, msg),
    child: (bindings: object) => createBrowserLogger((bindings as { context?: string }).context),
  }
}

export const logger: Logger = createBrowserLogger()

export function createLogger(context: string): Logger {
  return logger.child({ context })
}
