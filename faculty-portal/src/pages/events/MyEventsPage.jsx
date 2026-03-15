import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { eventApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Approval',
    badge: 'bg-yellow-100 text-yellow-800',
    icon:  '⏳',
    hint:  'Awaiting review by the Super Admin.',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-green-100 text-green-800',
    icon:  '✓',
    hint:  'Live — visible to students.',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-100 text-red-800',
    icon:  '✕',
    hint:  'Not published. See rejection reason below.',
  },
  flagged: {
    label: 'Flagged',
    badge: 'bg-orange-100 text-orange-800',
    icon:  '⚑',
    hint:  'Flagged for review by admin.',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-gray-100 text-gray-600',
    icon:  '—',
    hint:  'This event has been cancelled.',
  },
}

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const EventRow = ({ event, onDelete }) => {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.pending

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">{event.title}</h3>
          <p className="text-xs text-muted mt-0.5">
            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            &nbsp;&middot;&nbsp;{fmt(event.startDate)}
            &nbsp;&middot;&nbsp;{event.totalSeats} seats
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>
            {cfg.icon}&nbsp;{cfg.label}
          </span>
        </div>
      </div>

      {/* Status hint */}
      <p className="text-xs text-muted">{cfg.hint}</p>

      {/* Rejection reason */}
      {event.status === 'rejected' && event.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Reason: </span>{event.rejectionReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/events/${event._id}/edit`)}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/events/${event._id}/files`)}
        >
          Files
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(`/events/${event._id}/attendees`)}
        >
          Attendees
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onDelete(event._id)}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

const TABS = [
  { key: '',         label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const MyEventsPage = () => {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  const [tab, setTab]   = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['my-events', tab, page],
    queryFn:  () =>
      eventApi.getMyEvents({ status: tab || undefined, page, limit: 12 })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => eventApi.delete(id),
    onSuccess: () => {
      toast.success('Event deleted')
      qc.invalidateQueries(['my-events'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Delete failed'),
  })

  const handleDelete = (id) => {
    if (window.confirm('Delete this event? This cannot be undone.')) {
      deleteMutation.mutate(id)
    }
  }

  const events     = data?.data ?? []
  const totalPages = data?.pagination?.pages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="My Events"
          subtitle="Track the status of events you have submitted"
        />
        <Button onClick={() => navigate('/events/create')}>+ Create Event</Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pending approval banner */}
      {tab === '' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          Events you create are <strong>not visible to students</strong> until approved by the Super Admin.
          You will be notified once your event is reviewed.
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted text-sm">No events found.</p>
          <Button onClick={() => navigate('/events/create')}>Create your first event</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventRow key={ev._id} event={ev} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted self-center">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default MyEventsPage
