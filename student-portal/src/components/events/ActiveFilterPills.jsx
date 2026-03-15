import { X } from 'lucide-react'

// Human-readable labels for filter keys and values
const KEY_LABELS = {
  type:      'Type',
  timeframe: 'When',
  location:  'Location',
  isOnline:  'Mode',
  isFree:    'Fee',
  dateFrom:  'From',
  dateTo:    'To',
  tags:      'Tags',
  sortBy:    'Sort',
}

const VALUE_LABELS = {
  // timeframe
  upcoming:   'Upcoming',
  today:      'Today',
  this_week:  'This Week',
  this_month: 'This Month',
  past:       'Past',
  // isOnline
  true:       'Online',
  false:      'Offline',
  // isFree — handled inline below
  // sortBy
  startDate:  'Date',
  createdAt:  'Recently Added',
  viewCount:  'Most Popular',
  relevance:  'Relevance',
}

const SKIP = new Set(['page', 'search', 'college'])
const DEFAULT_SORT = 'startDate'

const formatValue = (key, value) => {
  if (key === 'isFree') return value === 'true' ? 'Free' : 'Paid'
  return VALUE_LABELS[value] ?? value
}

const ActiveFilterPills = ({ filters, setFilter, resetFilters }) => {
  const active = Object.entries(filters).filter(
    ([k, v]) => !SKIP.has(k) && v !== '' && !(k === 'sortBy' && v === DEFAULT_SORT)
  )

  if (active.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium shrink-0">Active:</span>

      {active.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full
            bg-[#dbeafe] text-[#1e3a8a] text-xs font-medium border border-[#bfdbfe]"
        >
          <span className="text-[#3b82f6] mr-0.5">{KEY_LABELS[key] ?? key}:</span>
          {formatValue(key, value)}
          <button
            onClick={() => setFilter(key, '')}
            className="ml-0.5 p-0.5 rounded-full hover:bg-[#bfdbfe] transition-colors"
            aria-label={`Remove ${KEY_LABELS[key] ?? key} filter`}
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      {active.length > 1 && (
        <button
          onClick={resetFilters}
          className="text-xs text-gray-500 hover:text-red-500 underline underline-offset-2
            transition-colors ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default ActiveFilterPills
