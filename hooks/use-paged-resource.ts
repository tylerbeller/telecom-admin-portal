"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch, buildQuery, isAbortError, type PagedResponse, type QueryValue } from "@/lib/api"

interface UsePagedResourceOptions {
  /** API path without query string, e.g. "/api/customers". */
  path: string
  pageSize: number
  /** Filter params; changing any of them reloads from page 0. */
  params?: Record<string, QueryValue>
  errorMessage: string
}

/**
 * Page-at-a-time list loader shared by the paginated resource hooks.
 *
 * Requests are aborted before a new one starts, so a slow earlier response can
 * never overwrite a newer one while the user types or pages quickly.
 */
export function usePagedResource<T>({
  path,
  pageSize,
  params,
  errorMessage,
}: UsePagedResourceOptions) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const pageRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  // Callers pass a fresh params object every render, so the serialized form is
  // what the fetch callback depends on.
  const paramsKey = JSON.stringify(params ?? {})

  const fetchPage = useCallback(
    async (pageNum = 0) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        setLoading(true)
        const query = buildQuery({
          ...(JSON.parse(paramsKey) as Record<string, QueryValue>),
          page: pageNum,
          size: pageSize,
        })
        const data = await apiFetch<PagedResponse<T>>(`${path}${query}`, {
          signal: controller.signal,
          errorMessage,
        })

        // A newer request may have started while this one was in flight; only
        // the newest response may write to state, so drop superseded results.
        if (abortRef.current !== controller) return
        setItems(data?.content ?? [])
        pageRef.current = data?.page ?? 0
        setPage(data?.page ?? 0)
        setTotalPages(data?.totalPages ?? 0)
        setTotalElements(data?.totalElements ?? 0)
        setError(null)
      } catch (e) {
        if (isAbortError(e)) return
        setError(e instanceof Error ? e.message : "Unknown error")
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    },
    [path, pageSize, paramsKey, errorMessage]
  )

  useEffect(() => {
    fetchPage(0)
  }, [fetchPage])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  const goToPage = useCallback(
    (next: number) => {
      fetchPage(next)
    },
    [fetchPage]
  )

  /** Reloads the page currently on screen (used after a mutation). */
  const refetch = useCallback(() => fetchPage(pageRef.current), [fetchPage])

  return {
    items,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    fetchPage,
    goToPage,
    refetch,
  }
}
