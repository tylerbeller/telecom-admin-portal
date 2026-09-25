/**
 * Feature flags. Env-driven, read once at module load. The pattern:
 *
 *   NEXT_PUBLIC_FLAG_<NAME>=true   enables; anything else (or unset) is off.
 *
 * Add a flag by adding a key here. Do not read process.env at call sites, so
 * every flag in the codebase is discoverable in this one file and dead flags
 * show up in a search for their key.
 */

const enabled = (name: string): boolean => process.env[`NEXT_PUBLIC_FLAG_${name}`] === "true"

export const flags = {
  /** Verbose request logging (per-attempt duration and retries) in the API client. */
  apiDebug: enabled("API_DEBUG"),
} as const

export type Flag = keyof typeof flags
