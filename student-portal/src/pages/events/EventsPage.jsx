import { SlidersHorizontal, Search, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import EventCard from '../../components/shared/EventCard'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import FilterSidebar from '../../components/events/FilterSidebar'
import ActiveFilterPills from '../../components/events/ActiveFilterPills'
import { useEventSearch } from '../../hooks/useEventSearch'

// ── Skeleton grid ──────────────────────────────────────────────────
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-72 bg-white border border-gray-200 rounded-xl animate-pulse" />
    ))}
  </div>
)

// ── Pagination bar ─────────────────────────────────────────────────
const Pagination = ({ pagination, page, setPage }) => {
  if (!pagination?.pages || pagination.pages <= 1) return null
  const { pages } = pagination

  // Show at most 5 page numbers centred around current page
  const range = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
    range.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <Button
        variant="secondary" size="sm"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>

      {range[0] > 1 && (
        <>
          <PageBtn n={1} current={page} setPage={setPage} />
          {range[0] > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
        </>
      )}
      {range.map((n) => <PageBtn key={n} n={n} current={page} setPage={setPage} />)}
      {range[range.length - 1] < pages && (
        <>
          {range[range.length - 1] < pages - 1 && (
            <span className="px-1 text-gray-400 text-sm">…</span>
          )}
          <PageBtn n={pages} current={page} setPage={setPage} />
        </>
      )}

      <Button
        variant="secondary" size="sm"
        disabled={page === pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}

const PageBtn = ({ n, current, setPage }) => (
  <button
    onClick={() => setPage(n)}
    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors
      ${n === current
        ? 'bg-[#1e3a8a] text-white'
        : 'text-gray-600 hover:bg-gray-100'
      }`}
  >
    {n}
  </button>
)

// ── Main page ──────────────────────────────────────────────────────
const EventsPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const {
    filters,
    setFilter,
    setPage,
    resetFilters,
    activeFilterCount,
    events,
    pagination,
    facets,
    isLoading,
    isFetching,
  } = useEventSearch()

  const resultLabel = isLoading
    ? 'Searching…'
    : `${pagination.total ?? 0} event${pagination.total !== 1 ? 's' : ''} found`

  return (
    <div className="space-y-5 max-w-7xl">
      <PageHeader
        title="Browse Events"
        subtitle="Discover hackathons, workshops, seminars and more"
      />

      {/* ── Search bar ── */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search by title, college, tags…"
          className="w-full pl-10 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-xl
            focus:outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10
            placeholder:text-gray-400 shadow-sm"
        />
        {filters.search && (
          <button
            onClick={() => setFilter('search', '')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400
              hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Toolbar: result count + filter toggle ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">{resultLabel}</span>
          {isFetching && !isLoading && (
            <Loader2 size={14} className="text-[#1e3a8a] animate-spin" />
          )}
        </div>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            border transition-colors
            ${sidebarOpen
              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
            }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
              ${sidebarOpen ? 'bg-white text-[#1e3a8a]' : 'bg-[#1e3a8a] text-white'}`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter pills ── */}
      <ActiveFilterPills
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
      />

      {/* ── Main layout: sidebar + grid ── */}
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        {sidebarOpen && (
          <FilterSidebar
            filters={filters}
            setFilter={setFilter}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            facets={facets}
          />
        )}

        {/* Results grid */}
        <div className="flex-1 min-w-0 space-y-5">
          {isLoading ? (
            <SkeletonGrid />
          ) : events.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
              <Search size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No events found</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Try adjusting your search or filters
              </p>
              {activeFilterCount > 0 && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 ${
              sidebarOpen
                ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}>
              {events.map((e) => <EventCard key={e._id} event={e} />)}
            </div>
          )}

          <Pagination
            pagination={pagination}
            page={filters.page}
            setPage={setPage}
          />
        </div>
      </div>
    </div>
  )
}

export default EventsPage
