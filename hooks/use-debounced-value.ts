"use client"

import { useEffect, useState } from "react"

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 * Keeps debounce logic out of page components (where useEffect is restricted
 * by the repo's ESLint rules).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
