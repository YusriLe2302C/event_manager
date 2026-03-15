import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { eventApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import { ChevronLeft, Users, Eye, TrendingUp, UserCheck } from 'lucide-react'

const fmt = (n) => (n ?? 0).toLocaleString('en-IN')

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} strokeWidth={1.75} />
    </div>
    <div>
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="text-xs text-subtle">{sub}</p>}
    </div>
  </div>
)

const FillBar = ({ rate, label }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="font-medium text-ink">{rate}%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-brand-500 rounded-full transition-all"
        style={{ width: `${Math.min(100, rate)}%` }}
      />
    </div>
  </div>
)

const Sparkline = ({ data = [], height = 56 }) => {
  if (!data.length) return <p className="text-xs text-muted text-center py-4">No trend data yet.</p>
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
      <polyline points={pts.join(' ')} fill="none" stroke="#0ea5e9"
        strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const Section = ({ title, children }) => (
  <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
    <h3 className="text-sm font-semibold text-ink">{title}</h3>
    {children}
  </div>
)

const EventAnalyticsPage = () => {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['event-analytics', id],
    queryFn:  () => eventApi.getAnalytics(id).then((r) => r.data.data),
    refetchInterval: 2 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data) return <p className="text-sm text-muted">Analytics not available.</p>

  const { event, registrations, checkIn, collegeParticipation, branchBreakdown, yearBreakdown, dailyTrend } = data

  return (
    <div className="max-w-5xl space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ChevronLeft size={15} /> Back to Events
      </Link>

      <PageHeader
        title={event.title}
        subtitle={`${event.type} · Analytics`}
      />

      {/* ── Top metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Confirmed"   value={fmt(registrations.confirmed)}
          icon={Users}     color="bg-green-50 text-green-600" />
        <StatCard label="Waitlisted"  value={fmt(registrations.waitlisted)}
          icon={TrendingUp} color="bg-yellow-50 text-yellow-600" />
        <StatCard label="Attended"    value={fmt(registrations.attended)}
          icon={UserCheck} color="bg-brand-50 text-brand-600"
          sub={`${checkIn.rate}% check-in rate`} />
        <StatCard label="Views"       value={fmt(event.viewCount)}
          icon={Eye}       color="bg-purple-50 text-purple-600" />
      </div>

      {/* ── Fill rate ── */}
      <Section title="Seat Fill Rate">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted">{fmt(event.registeredCount)} registered of {fmt(event.totalSeats)} seats</span>
          <span className="font-semibold text-ink">{event.fillRate}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, event.fillRate)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Confirmed',  value: registrations.confirmed,  color: 'text-green-600' },
            { label: 'Waitlisted', value: registrations.waitlisted, color: 'text-yellow-600' },
            { label: 'Cancelled',  value: registrations.cancelled,  color: 'text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-lg font-bold ${color}`}>{fmt(value)}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Daily trend ── */}
      <Section title="Daily Registration Trend (Last 30 Days)">
        <div className="h-14">
          <Sparkline data={dailyTrend} />
        </div>
        {dailyTrend?.length > 0 && (
          <div className="flex justify-between text-xs text-muted">
            <span>{dailyTrend[0]?.date}</span>
            <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── College participation ── */}
        <Section title="College Participation">
          {!collegeParticipation?.length ? (
            <p className="text-sm text-muted text-center py-4">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {collegeParticipation.map((col) => {
                const pct = registrations.confirmed + registrations.attended > 0
                  ? Math.round((col.count / (registrations.confirmed + registrations.attended)) * 100)
                  : 0
                return (
                  <div key={col.collegeId ?? col.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-ink truncate">{col.name}</span>
                      <span className="text-muted shrink-0 ml-2">{col.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── Branch & year breakdown ── */}
        <div className="space-y-6">
          <Section title="Branch Breakdown">
            {!branchBreakdown?.length ? (
              <p className="text-sm text-muted text-center py-4">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {branchBreakdown.map((b) => (
                  <div key={b.branch} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft truncate">{b.branch}</span>
                    <span className="font-medium text-ink ml-2">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Year of Study">
            {!yearBreakdown?.length ? (
              <p className="text-sm text-muted text-center py-4">No data yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {yearBreakdown.map((y) => (
                  <div key={y.year} className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-base font-bold text-ink">{y.count}</p>
                    <p className="text-xs text-muted">{y.year}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

export default EventAnalyticsPage
