import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import { Users, Building2, CalendarDays, ClipboardList, TrendingUp, Eye } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString('en-IN')

// ── Stat card ──────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
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

// ── Trend sparkline (pure SVG, no deps) ───────────────────────────

const Sparkline = ({ data = [], color = '#0ea5e9', height = 48 }) => {
  if (!data.length) return <div className="h-12 flex items-center justify-center text-xs text-muted">No data</div>
  const counts = data.map((d) => d.count)
  const max    = Math.max(...counts, 1)
  const min    = Math.min(...counts, 0)
  const range  = max - min || 1
  const w      = 400
  const pts    = counts.map((v, i) => {
    const x = (i / (counts.length - 1 || 1)) * w
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Fill rate bar ──────────────────────────────────────────────────

const FillBar = ({ rate }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-brand-500"
        style={{ width: `${Math.min(100, rate)}%` }}
      />
    </div>
    <span className="text-xs text-muted w-8 text-right">{rate}%</span>
  </div>
)

// ── Section wrapper ────────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {children}
  </div>
)

// ── Main dashboard ─────────────────────────────────────────────────

const AnalyticsDashboard = () => {
  const [trendDays, setTrendDays] = useState(30)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn:  () => adminApi.getAnalytics().then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
  })

  const { data: colleges, isLoading: collegesLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'colleges'],
    queryFn:  () => adminApi.getCollegeLeaderboard({ limit: 8 }).then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
  })

  const { data: popularEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'events'],
    queryFn:  () => adminApi.getPopularEvents({ limit: 8 }).then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
  })

  const { data: trend } = useQuery({
    queryKey: ['admin', 'analytics', 'trend', trendDays],
    queryFn:  () => adminApi.getRegistrationTrend({ days: trendDays }).then((r) => r.data.data),
    refetchInterval: 5 * 60_000,
  })

  const byRole = (role) => stats?.users?.byRole?.[role] ?? 0
  const byVS   = (vs)   => stats?.colleges?.byVerificationStatus?.[vs] ?? 0
  const byType = stats?.events?.byType ?? []

  const Skeleton = ({ h = 'h-32' }) => (
    <div className={`${h} bg-gray-100 rounded-xl animate-pulse`} />
  )

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader title="Platform Analytics" subtitle="Real-time platform statistics and trends" />

      {/* ── Top stat cards ── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users} label="Total Students" color="bg-brand-50 text-brand-600"
            value={fmt(byRole('student'))}
            sub={`${fmt(byRole('faculty'))} faculty`}
          />
          <StatCard
            icon={Building2} label="Colleges" color="bg-amber-50 text-amber-600"
            value={fmt(stats?.colleges?.total)}
            sub={`${fmt(byVS('pending'))} pending · ${fmt(byVS('verified'))} verified`}
          />
          <StatCard
            icon={CalendarDays} label="Total Events" color="bg-green-50 text-green-600"
            value={fmt(stats?.events?.total)}
            sub={`${fmt(stats?.events?.byStatus?.approved ?? 0)} approved`}
          />
          <StatCard
            icon={ClipboardList} label="Registrations" color="bg-purple-50 text-purple-600"
            value={fmt(stats?.registrations?.total)}
            sub={`${fmt(stats?.registrations?.last7Days)} this week`}
          />
        </div>
      )}

      {/* ── Registration trend ── */}
      <Section title="Registration Trend">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            {trend?.length ?? 0} days with registrations
          </p>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  trendDays === d
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-muted hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-16 mt-2">
          <Sparkline data={trend ?? []} />
        </div>
        {trend?.length > 0 && (
          <div className="flex justify-between text-xs text-muted pt-1">
            <span>{trend[0]?.date}</span>
            <span>{trend[trend.length - 1]?.date}</span>
          </div>
        )}
      </Section>

      {/* ── Events by type ── */}
      {!statsLoading && byType.length > 0 && (
        <Section title="Events by Type">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {byType.map(({ _id, count }) => (
              <div key={_id} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-ink">{count}</p>
                <p className="text-xs text-muted capitalize mt-0.5">{_id}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Most active colleges ── */}
        <Section title="Most Active Colleges">
          {collegesLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-10" />)}</div>
          ) : !colleges?.length ? (
            <p className="text-sm text-muted text-center py-6">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {colleges.map((col, i) => (
                <div key={col.collegeId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink truncate">{col.name}</p>
                      <span className="text-xs text-muted shrink-0">{fmt(col.totalRegistered)} regs</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted">{col.totalEvents} events</span>
                      <FillBar rate={col.avgFillRate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Most popular events ── */}
        <Section title="Most Popular Events">
          {eventsLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-10" />)}</div>
          ) : !popularEvents?.length ? (
            <p className="text-sm text-muted text-center py-6">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {popularEvents.map((ev, i) => (
                <div key={ev._id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink truncate">{ev.title}</p>
                      <span className="text-xs text-muted shrink-0">
                        {fmt(ev.registeredCount)}/{fmt(ev.totalSeats)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted capitalize">{ev.type}</span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Eye size={10} />{fmt(ev.viewCount)}
                      </span>
                      <FillBar rate={ev.fillRate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
