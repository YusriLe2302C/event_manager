import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { registrationApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import { Calendar, MapPin, Users, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Status config ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  confirmed:  { label: 'Confirmed',  color: 'bg-green-50 text-green-700 border-green-100',  icon: CheckCircle2 },
  waitlisted: { label: 'Waitlisted', color: 'bg-amber-50 text-amber-700 border-amber-100',  icon: Clock },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-50 text-red-600 border-red-100',        icon: X },
  attended:   { label: 'Attended',   color: 'bg-blue-50 text-blue-700 border-blue-100',     icon: CheckCircle2 },
}

const TABS = [
  { key: '',           label: 'All'       },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'waitlisted', label: 'Waitlisted'},
  { key: 'attended',   label: 'Attended'  },
  { key: 'cancelled',  label: 'Cancelled' },
]

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Cancel confirmation modal ──────────────────────────────────────

const CancelModal = ({ reg, onConfirm, onClose, loading }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-ink mb-1">Cancel Registration</h3>
        <p className="text-sm text-muted mb-4">
          Are you sure you want to cancel your registration for{' '}
          <strong>{reg.event?.title}</strong>?
        </p>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-4"
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Keep It</Button>
          <Button variant="danger" className="flex-1" loading={loading}
            onClick={() => onConfirm(reason)}>
            Yes, Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Registration ticket card ───────────────────────────────────────

const RegistrationCard = ({ reg, onCancelClick }) => {
  const cfg     = STATUS_CONFIG[reg.status] ?? STATUS_CONFIG.confirmed
  const Icon    = cfg.icon
  const canCancel = reg.status === 'confirmed' || reg.status === 'waitlisted'
  const isPast  = new Date(reg.event?.startDate) < new Date()

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Top strip — status color */}
      <div className={`h-1 ${reg.status === 'confirmed' ? 'bg-success' : reg.status === 'waitlisted' ? 'bg-warning' : reg.status === 'attended' ? 'bg-brand-500' : 'bg-border'}`} />

      <div className="p-4 flex items-start gap-4">
        {/* Thumbnail */}
        <Link to={`/events/${reg.event?._id}`} className="shrink-0">
          {reg.event?.bannerImage ? (
            <img
              src={reg.event.bannerImage}
              alt=""
              className="w-20 h-20 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-brand-50 flex items-center justify-center text-brand-300 text-3xl font-bold border border-border">
              {reg.event?.title?.charAt(0)}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                to={`/events/${reg.event?._id}`}
                className="font-semibold text-ink text-sm hover:text-brand-700 transition-colors line-clamp-1"
              >
                {reg.event?.title}
              </Link>
              <p className="text-xs text-muted">{reg.event?.college?.name}</p>
            </div>
            <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
              <Icon size={11} />
              {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {fmt(reg.event?.startDate)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {reg.event?.isOnline ? 'Online' : (reg.event?.venue || 'TBA')}
            </span>
            {reg.isTeamRegistration && reg.teamName && (
              <span className="flex items-center gap-1">
                <Users size={11} />
                {reg.teamName}
              </span>
            )}
          </div>

          {/* Waitlist notice */}
          {reg.status === 'waitlisted' && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              <AlertCircle size={12} />
              You're on the waitlist. We'll notify you if a seat opens.
            </div>
          )}

          {/* Registered at */}
          <p className="text-[11px] text-subtle">
            Registered {fmt(reg.registeredAt)}
            {reg.status === 'cancelled' && reg.cancelledAt && ` · Cancelled ${fmt(reg.cancelledAt)}`}
          </p>
        </div>
      </div>

      {/* Footer actions */}
      {canCancel && !isPast && (
        <div className="px-4 pb-4 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-red-50 text-xs"
            onClick={() => onCancelClick(reg)}
          >
            <X size={13} /> Cancel Registration
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────

const MyRegistrationsPage = () => {
  const qc = useQueryClient()
  const [activeTab,    setActiveTab]    = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['registrations', 'my', activeTab],
    queryFn:  () => registrationApi.getMine({ limit: 50, status: activeTab || undefined }),
    select:   (res) => res.data,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ eventId, reason }) => registrationApi.cancel(eventId, { reason }),
    onSuccess: () => {
      toast.success('Registration cancelled')
      qc.invalidateQueries(['registrations', 'my'])
      setCancelTarget(null)
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to cancel'),
  })

  const registrations = data?.data ?? []
  const total         = data?.pagination?.total ?? 0

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="My Registrations"
        subtitle={`${total} total registration${total !== 1 ? 's' : ''}`}
      />

      {/* Status tabs */}
      <div className="flex gap-1 bg-canvas border border-border rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-surface text-ink shadow-sm border border-border'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-16 text-center">
          <Calendar size={32} className="text-border mx-auto mb-3" />
          <p className="text-sm text-muted">
            {activeTab ? `No ${activeTab} registrations.` : "You haven't registered for any events yet."}
          </p>
          <Link to="/events" className="text-sm text-brand-600 hover:underline mt-2 inline-block">
            Browse Events →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <RegistrationCard
              key={reg._id}
              reg={reg}
              onCancelClick={setCancelTarget}
            />
          ))}
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          reg={cancelTarget}
          loading={cancelMutation.isPending}
          onConfirm={(reason) =>
            cancelMutation.mutate({ eventId: cancelTarget.event?._id, reason })
          }
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}

export default MyRegistrationsPage
