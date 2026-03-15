import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'hackathon',   label: 'Hackathon' },
  { value: 'workshop',    label: 'Workshop' },
  { value: 'seminar',     label: 'Seminar' },
  { value: 'competition', label: 'Competition' },
  { value: 'webinar',     label: 'Webinar' },
  { value: 'other',       label: 'Other' },
]

const TIMEFRAMES = [
  { value: 'upcoming',   label: 'Upcoming' },
  { value: 'today',      label: 'Today' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'past',       label: 'Past Events' },
]

const SORT_OPTIONS = [
  { value: 'startDate',  label: 'Date (Earliest)' },
  { value: 'createdAt',  label: 'Recently Added' },
  { value: 'viewCount',  label: 'Most Popular' },
  { value: 'relevance',  label: 'Relevance' },
]

// ── Collapsible section wrapper ────────────────────────────────────
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold
          text-gray-500 uppercase tracking-wider mb-3 hover:text-gray-700"
      >
        {title}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && children}
    </div>
  )
}

// ── Pill toggle button ─────────────────────────────────────────────
const Pill = ({ label, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
      border transition-colors
      ${active
        ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a8a] hover:text-[#1e3a8a]'
      }`}
  >
    {label}
    {count !== undefined && (
      <span className={`text-[10px] ${active ? 'text-blue-200' : 'text-gray-400'}`}>
        {count}
      </span>
    )}
  </button>
)

// ── Main sidebar ───────────────────────────────────────────────────
const FilterSidebar = ({ filters, setFilter, resetFilters, activeFilterCount, facets }) => {
  return (
    <aside className="w-64 shrink-0 bg-white border border-gray-200 rounded-xl p-5 self-start sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs text-[#1e3a8a] hover:underline font-medium"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Event Type ── */}
      <FilterSection title="Event Type">
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <Pill
              key={t.value}
              label={t.label}
              active={filters.type === t.value}
              count={facets.types?.[t.value]}
              onClick={() => setFilter('type', filters.type === t.value ? '' : t.value)}
            />
          ))}
        </div>
      </FilterSection>

      {/* ── Timeframe ── */}
      <FilterSection title="When">
        <div className="flex flex-col gap-1.5">
          {TIMEFRAMES.map((t) => (
            <label key={t.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="timeframe"
                value={t.value}
                checked={filters.timeframe === t.value}
                onChange={() =>
                  setFilter('timeframe', filters.timeframe === t.value ? '' : t.value)
                }
                className="accent-[#1e3a8a] w-3.5 h-3.5"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{t.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* ── Location ── */}
      <FilterSection title="Location">
        <input
          type="text"
          value={filters.location}
          onChange={(e) => setFilter('location', e.target.value)}
          placeholder="City or venue..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
            focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20
            placeholder:text-gray-400"
        />
      </FilterSection>

      {/* ── Mode ── */}
      <FilterSection title="Mode">
        <div className="flex gap-2">
          <Pill
            label="Online"
            active={filters.isOnline === 'true'}
            count={facets.online?.['true']}
            onClick={() => setFilter('isOnline', filters.isOnline === 'true' ? '' : 'true')}
          />
          <Pill
            label="Offline"
            active={filters.isOnline === 'false'}
            count={facets.online?.['false']}
            onClick={() => setFilter('isOnline', filters.isOnline === 'false' ? '' : 'false')}
          />
        </div>
      </FilterSection>

      {/* ── Fee ── */}
      <FilterSection title="Fee">
        <div className="flex gap-2">
          <Pill
            label="Free"
            active={filters.isFree === 'true'}
            count={facets.free?.['true']}
            onClick={() => setFilter('isFree', filters.isFree === 'true' ? '' : 'true')}
          />
          <Pill
            label="Paid"
            active={filters.isFree === 'false'}
            count={facets.free?.['false']}
            onClick={() => setFilter('isFree', filters.isFree === 'false' ? '' : 'false')}
          />
        </div>
      </FilterSection>

      {/* ── Date Range ── */}
      <FilterSection title="Date Range" defaultOpen={false}>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilter('dateFrom', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilter('dateTo', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20"
            />
          </div>
        </div>
      </FilterSection>

      {/* ── Tags ── */}
      <FilterSection title="Tags" defaultOpen={false}>
        <input
          type="text"
          value={filters.tags}
          onChange={(e) => setFilter('tags', e.target.value)}
          placeholder="e.g. ai, cloud, design"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
            focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20
            placeholder:text-gray-400"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">Comma-separated tags</p>
      </FilterSection>

      {/* ── Sort ── */}
      <FilterSection title="Sort By" defaultOpen={false}>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilter('sortBy', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
            focus:outline-none focus:border-[#1e3a8a] text-gray-700"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterSection>
    </aside>
  )
}

export default FilterSidebar
