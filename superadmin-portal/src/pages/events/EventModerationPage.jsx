import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import toast from 'react-hot-toast'

const STATUS_BADGE = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100  text-green-800',
  rejected: 'bg-red-100    text-red-800',
}

const RejectModal = ({ event, onClose, onConfirm, isPending }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink">Reject Event</h3>
        <p className="text-sm text-muted">
          Rejecting <span className="font-medium text-ink">"{event.title}"</span>.
          The faculty will be notified with your reason.
        </p>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            placeholder="Explain why this event is being rejected…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!reason.trim() || isPending}
            loading={isPending}
            onClick={() => onConfirm(reason)}
          >
            Reject Event
          </Button>
        </div>
      </div>
    </div>
  )
}

const EventCard = ({ event, onApprove, onReject }) => {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">{event.title}</h3>
          <p className="text-xs text-muted mt-0.5">
            {event.college?.name} &middot; {event.createdBy?.name} ({event.createdBy?.email})
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[event.status]}`}>
          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
        </span>
      </div>

      <p className="text-xs text-ink-soft line-clamp-2">{event.description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted">
        <span><span className="font-medium text-ink-soft">Type:</span> {event.type}</span>
        <span><span className="font-medium text-ink-soft">Seats:</span> {event.totalSeats}</span>
        <span><span className="font-medium text-ink-soft">Start:</span> {fmt(event.startDate)}</span>
        <span><span className="font-medium text-ink-soft">Deadline:</span> {fmt(event.registrationDeadline)}</span>
      </div>

      {event.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.tags.map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}

      {event.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onApprove(event)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => onReject(event)}>Reject</Button>
        </div>
      )}
    </div>
  )
}

const EventModerationPage = () => {
  const qc = useQueryClient()
  const [tab, setTab]           = useState('pending')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [page, setPage]         = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', tab, page],
    queryFn:  () => adminApi.getPendingEvents({ status: tab, page, limit: 15 }).then((r) => r.data),
    keepPreviousData: true,
  })

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.approveEvent(id),
    onSuccess: () => {
      toast.success('Event approved — students will be notified')
      qc.invalidateQueries(['admin-events'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Approval failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectEvent(id, { reason }),
    onSuccess: () => {
      toast.success('Event rejected — faculty will be notified')
      setRejectTarget(null)
      qc.invalidateQueries(['admin-events'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Rejection failed'),
  })

  const events     = data?.data ?? []
  const pagination = data?.pagination ?? {}
  const totalPages = pagination.pages ?? 1

  const TABS = [
    { key: 'pending',  label: 'Pending Approval' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Moderation"
        subtitle="Review and approve events submitted by faculty before they go live"
      />

      {/* Tabs */}
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          No {tab} events found.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventCard
              key={ev._id}
              event={ev}
              onApprove={(e) => approveMutation.mutate(e._id)}
              onReject={(e) => setRejectTarget(e)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary" size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted self-center">Page {page} of {totalPages}</span>
          <Button
            variant="secondary" size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          event={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget._id, reason })}
          isPending={rejectMutation.isPending}
        />
      )}
    </div>
  )
}

export default EventModerationPage
