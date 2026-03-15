import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { eventApi } from '../api/services'

const DEBOUNCE_MS = 350

// Parse URL search params into filter object
const paramsToFilters = (sp) => ({
  search:    sp.get('search')    || '',
  type:      sp.get('type')      || '',
  college:   sp.get('college')   || '',
  location:  sp.get('location')  || '',
  timeframe: sp.get('timeframe') || '',
  dateFrom:  sp.get('dateFrom')  || '',
  dateTo:    sp.get('dateTo')    || '',
  isOnline:  sp.get('isOnline')  || '',
  isFree:    sp.get('isFree')    || '',
  tags:      sp.get('tags')      || '',
  sortBy:    sp.get('sortBy')    || 'startDate',
  page:      Number(sp.get('page') || 1),
})

// Strip empty values before sending to API
const toApiParams = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )

// Count how many non-default filters are active (excludes sortBy, page, search)
export const countActiveFilters = (filters) => {
  const skip = new Set(['sortBy', 'page', 'search'])
  return Object.entries(filters).filter(([k, v]) => !skip.has(k) && v !== '').length
}

export const useEventSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => paramsToFilters(searchParams))

  // Debounced search term — only the search string is debounced;
  // all other filters apply immediately.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [filters.search])

  // Sync filters → URL (replaces history entry so back button works)
  useEffect(() => {
    const params = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) params[k] = String(v)
    })
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  // Build the query params sent to the API
  const apiParams = toApiParams({ ...filters, search: debouncedSearch })

  const query = useQuery({
    queryKey: ['events', 'search', apiParams],
    queryFn:  () => eventApi.search(apiParams),
    select:   (res) => res.data,
    keepPreviousData: true,
    staleTime: 30_000,
  })

  // ── Filter setters ─────────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      search: '', type: '', college: '', location: '',
      timeframe: '', dateFrom: '', dateTo: '',
      isOnline: '', isFree: '', tags: '',
      sortBy: 'startDate', page: 1,
    })
  }, [])

  return {
    filters,
    setFilter,
    setPage,
    resetFilters,
    activeFilterCount: countActiveFilters(filters),
    events:     query.data?.data        ?? [],
    pagination: query.data?.pagination  ?? {},
    facets:     query.data?.pagination?.facets ?? {},
    isLoading:  query.isLoading,
    isFetching: query.isFetching,
  }
}
