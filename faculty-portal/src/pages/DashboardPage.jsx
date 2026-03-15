import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { eventApi } from '../api/services'
import useAuthStore from '../store/authStore'
import PageHeader from '../components/shared/PageHeader'
import Button from '../components/shared/Button'
import { CalendarDays, Users, TrendingUp, PlusCircle } from 'lucide-react'

const fmt = (n) => (n ?? 0).toLocaleString('en-IN')

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon size={20} strokeWidth={1.75} />
    </div>
    <div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  </div>
)

const STATUS_BADGE = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  flagged:  'bg-orange-100 text-orange-800',
  cancelled:'bg-gray-100 text-gray-600',
}

const DashboardPage = () => {
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: analyticsData } = useQuery({
    queryKey: ['faculty-analytics'],
    queryFn:  () => eventApi.getMyAnalytics().then((r) => r.data.data),
  })

  const { data: recentEvents } = useQuery({
    queryKey: ['my-events', '', 1],
    queryFn:  () => eventApi.getMyEvents({ limit: 5 }).then((r) => r.data),
  })

  const s      = analyticsData?.summary
  const events = recentEvents?.data ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <PageHeader
          title={`Welcome, ${user?.name?.split(' ')[0]}`}
          subtitle="Manage your events and track registrations"
        />
        <Button onClick={() => navigate('/events/create')}>
          <PlusCircle size={16} className="mr-1.5" /> Create Event
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarDays} label="Total Events"
          value={fmt(s?.totalEvents)}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={Users} label="Total Registrations"
          value={fmt(s?.totalRegistered)}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={TrendingUp} label="Avg Fill Rate"
          value={`${s?.avgFillRate ?? 0}%`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Recent Events</h3>
          <button
            onClick={() => navigate('/events')}
            className="text-xs text-brand-600 hover:underline font-medium"
          >
            View all →
          </button>
        </div>
        {events.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-muted">No events yet.</p>
            <Button size="sm" onClick={() => navigate('/events/create')}>
              Create your first event
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((ev) => (
              <div key={ev._id} className="flex items-center justify-between px-5 py-3 hover:bg-canvas transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{ev.title}</p>
                  <p className="text-xs text-muted capitalize">{ev.type}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[ev.status] ?? STATUS_BADGE.pending}`}>
                    {ev.status}
                  </span>
                  <button
                    onClick={() => navigate(`/events/${ev._id}/attendees`)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Attendees
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
