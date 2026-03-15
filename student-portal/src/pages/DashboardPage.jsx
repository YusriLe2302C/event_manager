import { useQuery } from '@tanstack/react-query'
import { eventApi, registrationApi } from '../api/services'
import useAuthStore from '../store/authStore'
import EventCard from '../components/shared/EventCard'
import PageHeader from '../components/shared/PageHeader'
import { CalendarCheck, BookmarkCheck, ClipboardList } from 'lucide-react'

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

const DashboardPage = () => {
  const user = useAuthStore((s) => s.user)

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => eventApi.getAll({ limit: 6, sortBy: 'startDate' }),
    select: (res) => res.data.data,
  })

  const { data: regsData } = useQuery({
    queryKey: ['registrations', 'my'],
    queryFn: () => registrationApi.getMine({ limit: 1 }),
    select: (res) => res.data.pagination?.total ?? 0,
  })

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's what's happening on campus"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Registrations"
          value={regsData ?? '—'}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          icon={CalendarCheck}
          label="Upcoming Events"
          value={eventsData?.length ?? '—'}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={BookmarkCheck}
          label="Bookmarks"
          value="—"
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Upcoming events */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Upcoming Events</h2>
        {eventsData?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsData.map((e) => <EventCard key={e._id} event={e} />)}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-10 text-center text-muted text-sm">
            No upcoming events right now.
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
