import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { registrationApi, eventApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import {
  Search, Download, UserCheck, Users,
  Lock, Settings, CheckCircle2, Clock,
  ChevronLeft, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_STYLES = {
  confirmed:  'bg-green-50 text-green-700',
  waitlisted: 'bg-amber-50 text-amber-700',
  cancelled:  'bg-red-50 text-red-600',
  attended:   'bg-blue-50 text-blue-700',
}

// ── Seat limit modal ───────────────────────────────────────────────

const SeatModal = ({ current, onSave, onClose, loading }) => {
  const [seats, setSeats] = useState(current)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-ink mb-4">Update Seat Limit</h3>
        <input
          type="number"
          min={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
        />
        <p className="text-xs text-muted mb-4">
          Increasing seats will automatically promote waitlisted students.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={() => onSave(seats)}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Close registration confirm modal ──────────────────────────────

const CloseModal = ({ eventTitle, onConfirm, onClose, loading }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl">
      <div className="flex items-center gap-2 text-warning mb-3">
        <AlertTriangle size={18} />
        <h3 className="font-semibold text-ink">Close Registration</h3>
      </div>
      <p className="text-sm text-muted mb-2">
        This will immediately close registration for <strong>{eventTitle}</strong>.
      </p>
      <p className="text-sm text-muted mb-6">
        All waitlisted students will be notified and their registrations cancelled.
        This action cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={onConfirm}>
          Close Registration
        </Button>
      </div>
    </div>
  </div>
)

// ── Main page ──────────────────────────────────────────────────────

const EventAttendeesPage = () => {
  const { id: eventId } = useParams()
  const qc = useQueryClient()

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showSeatModal,  setShowSeatModal]  = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  // Fetch attendees
  const { data, isLoading } = useQuery({
    queryKey: ['attendees', eventId, statusFilter],
    queryFn:  () => registrationApi.getEventAttendees(eventId, {
      status: statusFilter || undefined,
      limit:  200,
    }),
    select: (res) => res.data,
  })

  const attendees  = data?.data ?? []
  const eventMeta  = data?.pagination?.eventMeta
  const total      = data?.pagination?.total ?? 0

  // Client-side search filter
  const filtered = search
    ? attendees.filter((r) => {
        const s = search.toLowerCase()
        return (
          r.student?.name?.toLowerCase().includes(s) ||
          r.student?.email?.toLowerCase().includes(s) ||
          r.student?.rollNumber?.toLowerCase().includes(s)
        )
      })
    : attendees

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (regId) => registrationApi.checkIn(eventId, regId),
    onSuccess: () => {
      toast.success('Checked in')
      qc.invalidateQueries(['attendees', eventId])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Check-in failed'),
  })

  // Close registration mutation
  const closeMutation = useMutation({
    mutationFn: () => registrationApi.closeRegistration(eventId),
    onSuccess: () => {
      toast.success('Registration closed')
      setShowCloseModal(false)
      qc.invalidateQueries(['attendees', eventId])
      qc.invalidateQueries(['my-events'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to close'),
  })

  // Seat limit mutation
  const seatMutation = useMutation({
    mutationFn: (totalSeats) => registrationApi.updateSeatLimit(eventId, { totalSeats }),
    onSuccess: (res) => {
      toast.success('Seat limit updated')
      setShowSeatModal(false)
      qc.invalidateQueries(['attendees', eventId])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Failed to update'),
  })

  // Export CSV
  const handleExport = async () => {
    try {
      const res = await registrationApi.exportAttendees(eventId)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `attendees_${eventId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    }
  }

  const confirmedCount  = attendees.filter((r) => r.status === 'confirmed').length
  const attendedCount   = attendees.filter((r) => r.status === 'attended').length
  const waitlistedCount = attendees.filter((r) => r.status === 'waitlisted').length

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back link */}
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
        <ChevronLeft size={15} /> Back to Events
      </Link>

      <PageHeader
        title={eventMeta?.title ?? 'Attendees'}
        subtitle={`${total} registration${total !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowSeatModal(true)}>
              <Settings size={14} /> Seats
            </Button>
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </Button>
            <Button size="sm" variant="danger" onClick={() => setShowCloseModal(true)}>
              <Lock size={14} /> Close Registration
            </Button>
          </div>
        }
      />

      {/* Stats bar */}
      {eventMeta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Seats',   value: eventMeta.totalSeats,      icon: Users,       color: 'text-ink' },
            { label: 'Confirmed',     value: confirmedCount,             icon: CheckCircle2,color: 'text-success' },
            { label: 'Attended',      value: attendedCount,              icon: UserCheck,   color: 'text-brand-600' },
            { label: 'Waitlisted',    value: waitlistedCount,            icon: Clock,       color: 'text-warning' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon size={18} className={`shrink-0 ${color}`} strokeWidth={1.75} />
              <div>
                <p className="text-xl font-bold text-ink">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seat fill bar */}
      {eventMeta && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>{eventMeta.registeredCount} registered</span>
            <span>{eventMeta.seatsLeft} seats left</span>
          </div>
          <div className="h-2 bg-canvas rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (eventMeta.registeredCount / eventMeta.totalSeats) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, roll number..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="attended">Attended</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-canvas rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-muted text-sm">
            {search ? 'No results match your search.' : 'No registrations yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-canvas">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Roll / Branch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Team</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((reg, i) => (
                  <tr key={reg._id} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{reg.student?.name}</p>
                      <p className="text-xs text-muted">{reg.student?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      <p>{reg.student?.rollNumber ?? '—'}</p>
                      <p>{reg.student?.branch ?? ''} {reg.student?.year ? `Y${reg.student.year}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {reg.isTeamRegistration ? (
                        <span title={reg.teamMembers?.map((m) => m.name).join(', ')}>
                          {reg.teamName ?? '—'}
                          {reg.teamMembers?.length > 0 && (
                            <span className="text-subtle"> +{reg.teamMembers.length}</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{fmt(reg.registeredAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[reg.status]}`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {reg.status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={checkInMutation.isPending}
                          onClick={() => checkInMutation.mutate(reg._id)}
                        >
                          <UserCheck size={13} /> Check In
                        </Button>
                      )}
                      {reg.status === 'attended' && (
                        <span className="text-xs text-brand-600 flex items-center gap-1">
                          <CheckCircle2 size={13} /> Checked In
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSeatModal && (
        <SeatModal
          current={eventMeta?.totalSeats ?? 0}
          loading={seatMutation.isPending}
          onSave={(seats) => seatMutation.mutate(seats)}
          onClose={() => setShowSeatModal(false)}
        />
      )}
      {showCloseModal && (
        <CloseModal
          eventTitle={eventMeta?.title}
          loading={closeMutation.isPending}
          onConfirm={() => closeMutation.mutate()}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  )
}

export default EventAttendeesPage
