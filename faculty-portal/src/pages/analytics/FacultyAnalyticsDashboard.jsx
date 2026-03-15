import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { eventApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import { CalendarDays, Users, Eye, TrendingUp, BarChart2 } from 'lucide-react'

const fmt = (n) => (n ?? 0).toLocaleString('en-IN')

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-surface border border-border rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
    </div>
    <p className="text-3xl font-bold text-ink">{value ?? '—'}</p>
    {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
  </div>
)

const Sparkline = ({ data = [], height = 56 }) => {
  if (!data.length)
    return <p className="text-xs text-muted text-center py-4">No registrations in the last 30 days.</p>
  const counts = data.map((d) => d.count)
  const max = Math.max(...counts, 1)
  const min = Math.min(...counts, 0)
  const range = max - min || 1
  const w = 400
  const pts = counts.map((v, i) => {
    const x = (i / (counts.length - 1 || 1)) * w
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke="#0ea5e9"
        strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const FacultyAnalyticsDashboard = () => {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['faculty-analytics'],
    queryFn:  () => eventApi.getMyAnalytics().then((r) => r.data.data),
    refetchInterval: 3 * 60_000,
  })

  const s = data?.summary

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="My Analytics" subtitle="Performance overview for your events" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Events" icon={CalendarDays} color="bg-brand-50 text-brand-600"
          value={fmt(s?.totalEvents)}
          sub={`${s?.approvedEvents ?? 0} approved · ${s?.pendingEvents ?? 0} pending`}
        />
        <StatCard
          label="Total Registrations" icon={Users} color="bg-green-50 text-green-600"
          value={fmt(s?.totalRegistered)}
          sub={`Avg fill rate ${s?.avgFillRate ?? 0}%`}
        />
        <StatCard
          label="Total Seats" icon={TrendingUp} color="bg-amber-50 text-amber-600"
          value={fmt(s?.totalSeats)}
        />
        <StatCard
          label="Total Views" icon={Eye} color="bg-purple-50 text-purple-600"
          value={fmt(s?.totalViews)}
        />
      </div>

      {/* Event status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Approved', value: s?.approvedEvents, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending',  value: s?.pendingEvents,  color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Rejected', value: s?.rejectedEvents, color: 'text-red-500',    bg: 'bg-red-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-border rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
            <p className="text-xs text-muted mt-0.5">{label} Events</p>
          </div>
        ))}
      </div>

      {/* Registration trend */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-ink">Registration Trend (Last 30 Days)</h3>
        <div className="h-14">
          <Sparkline data={data?.registrationTrend ?? []} />
        </div>
        {data?.registrationTrend?.length > 0 && (
          <div className="flex justify-between text-xs text-muted">
            <span>{data.registrationTrend[0]?.date}</span>
            <span>{data.registrationTrend[data.registrationTrend.length - 1]?.date}</span>
          </div>
        )}
      </div>

      {/* Top events table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Top Events by Registrations</h3>
          <BarChart2 size={16} className="text-muted" />
        </div>
        {!data?.topEvents?.length ? (
          <p className="text-sm text-muted text-center py-8">No approved events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  {['Event', 'Type', 'Registrations', 'Fill Rate', 'Views', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topEvents.map((ev) => (
                  <tr key={ev._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink max-w-[200px] truncate">{ev.title}</td>
                    <td className="px-4 py-3 text-muted capitalize">{ev.type}</td>
                    <td className="px-4 py-3 text-ink">
                      {fmt(ev.registeredCount)}
                      <span className="text-muted">/{fmt(ev.totalSeats)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${Math.min(100, ev.fillRate)}%` }} />
                        </div>
                        <span className="text-xs text-muted">{ev.fillRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{fmt(ev.viewCount)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/events/${ev._id}/analytics`)}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacultyAnalyticsDashboard
