"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch, buildQuery, isAbortError, type PagedResponse, type QueryValue } from "@/lib/api"

interface UseInfiniteResourceOptions {
  /** API path without query string, e.g. "/api/tickets". */
  path: string
  pageSize: number
  /** Filter params; changing any of them restarts from page 0. */
  params?: Record<string, QueryValue>
  errorMessage: string
}

/**
 * Append-as-you-scroll list loader shared by the infinite-scroll hooks.
 *
 * Only the newest request may write to state, so changing filters mid-flight
 * cannot leave rows from the previous filter appended to the list.
 */
export function useInfiniteResource<T>({
  path,
  pageSize,
  params,
  errorMessage,
}: UseInfiniteResourceOptions) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const pageRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const paramsKey = JSON.stringify(params ?? {})

  const fetchRecords = useCallback(
    async (reset = true) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const nextPage = reset ? 0 : pageRef.current + 1
      try {
        if (reset) setLoading(true)
        else setLoadingMore(true)

        const query = buildQuery({
          ...(JSON.parse(paramsKey) as Record<string, QueryValue>),
          page: nextPage,
          size: pageSize,
        })
        const data = await apiFetch<PagedResponse<T>>(`${path}${query}`, {
          signal: controller.signal,
          errorMessage,
        })

        // A newer request may have started while this one was in flight; only
        // the newest response may write to state, so drop superseded results.
        if (abortRef.current !== controller) return

        const content = data?.content ?? []
        pageRef.current = nextPage
        setItems((prev) => (reset ? content : [...prev, ...content]))
        setHasNext(data?.hasNext ?? false)
        setTotalElements(data?.totalElements ?? 0)
        setError(null)
      } catch (e) {
        if (isAbortError(e)) return
        setError(e instanceof Error ? e.message : "Unknown error")
      } finally {
        if (abortRef.current === controller) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [path, pageSize, paramsKey, errorMessage]
  )

  useEffect(() => {
    fetchRecords(true)
  }, [fetchRecords])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNext) fetchRecords(false)
  }, [fetchRecords, loadingMore, hasNext])

  const refresh = useCallback(() => fetchRecords(true), [fetchRecords])

  return {
    items,
    setItems,
    loading,
    loadingMore,
    error,
    hasNext,
    totalElements,
    loadMore,
    refresh,
  }
}
