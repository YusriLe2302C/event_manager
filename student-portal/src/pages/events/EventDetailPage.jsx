import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventApi, registrationApi, userApi } from '../../api/services'
import Button from '../../components/shared/Button'
import {
  Calendar, MapPin, Users, Download, Bookmark,
  ExternalLink, Clock, CheckCircle2, Trophy,
  AlertCircle, BookmarkCheck, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────

const fmt = (d) =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const TYPE_COLORS = {
  hackathon:   'bg-blue-50 text-blue-700 border-blue-100',
  workshop:    'bg-green-50 text-green-700 border-green-100',
  seminar:     'bg-purple-50 text-purple-700 border-purple-100',
  competition: 'bg-orange-50 text-orange-700 border-orange-100',
  webinar:     'bg-teal-50 text-teal-700 border-teal-100',
  other:       'bg-gray-50 text-gray-600 border-gray-100',
}

// ── Countdown hook ─────────────────────────────────────────────────

const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) { setTimeLeft('Deadline passed'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) setTimeLeft(`${d}d ${h}h left`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m left`)
      else setTimeLeft(`${m}m left`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

// ── Seat progress bar ──────────────────────────────────────────────

const SeatBar = ({ registered, total }) => {
  const pct     = Math.min(100, Math.round((registered / total) * 100))
  const color   = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success'
  const left    = total - registered

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted">
        <span>{registered} registered</span>
        <span className={left === 0 ? 'text-danger font-medium' : ''}>
          {left === 0 ? 'Fully Booked' : `${left} seats left`}
        </span>
      </div>
      <div className="h-2 bg-canvas rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-subtle text-right">{pct}% filled</p>
    </div>
  )
}

// ── Team member row ────────────────────────────────────────────────

const TeamMemberRow = ({ index, member, onChange, onRemove }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted w-5 shrink-0">{index + 2}.</span>
    <input
      value={member.name}
      onChange={(e) => onChange(index, 'name', e.target.value)}
      placeholder="Name"
      className="flex-1 px-2.5 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
    />
    <input
      value={member.email}
      onChange={(e) => onChange(index, 'email', e.target.value)}
      placeholder="Email"
      className="flex-1 px-2.5 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
    />
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="p-1.5 text-muted hover:text-danger rounded transition-colors"
    >
      <X size={14} />
    </button>
  </div>
)

// ── Confirmation modal ─────────────────────────────────────────────

const ConfirmModal = ({ event, teamName, teamMembers, onConfirm, onClose, loading }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-ink">Confirm Registration</h3>
        <button onClick={onClose} className="p-1 text-muted hover:text-ink rounded">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        <div className="bg-canvas rounded-xl p-4 space-y-2">
          <p className="font-medium text-ink text-sm">{event.title}</p>
          <p className="text-xs text-muted">{event.college?.name}</p>
          <div className="flex items-center gap-4 text-xs text-muted pt-1">
            <span className="flex items-center gap-1"><Calendar size={11} />{fmt(event.startDate)}</span>
            <span className="flex items-center gap-1"><MapPin size={11} />{event.isOnline ? 'Online' : event.venue}</span>
          </div>
        </div>

        {event.isTeamEvent && teamName && (
          <div className="text-sm text-ink-soft">
            <span className="font-medium">Team:</span> {teamName}
            {teamMembers.length > 0 && (
              <span className="text-muted"> + {teamMembers.length} member{teamMembers.length > 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Registration Fee</span>
          <span className={`font-semibold ${event.isFree ? 'text-success' : 'text-ink'}`}>
            {event.isFree ? 'Free' : `₹${event.fee}`}
          </span>
        </div>

        <p className="text-xs text-muted bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          By registering, you agree to the event's terms and conditions.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={onConfirm}>
          Confirm Registration
        </Button>
      </div>
    </div>
  </div>
)

// ── Main component ─────────────────────────────────────────────────

const EventDetailPage = () => {
  const { id } = useParams()
  const qc     = useQueryClient()

  const [showConfirm, setShowConfirm] = useState(false)
  const [teamName,    setTeamName]    = useState('')
  const [teamMembers, setTeamMembers] = useState([])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn:  () => eventApi.getById(id),
    select:   (res) => res.data.data,
  })

  const { data: regStatus } = useQuery({
    queryKey: ['reg-status', id],
    queryFn:  () => registrationApi.getStatus(id),
    select:   (res) => res.data.data,
    enabled:  !!event,
  })

  const countdown = useCountdown(event?.registrationDeadline)

  const registerMutation = useMutation({
    mutationFn: () => registrationApi.register(id, {
      teamName:    event?.isTeamEvent ? teamName : undefined,
      teamMembers: event?.isTeamEvent ? teamMembers : undefined,
    }),
    onSuccess: (res) => {
      const status = res.data.data?.status
      toast.success(status === 'waitlisted'
        ? 'Added to waitlist! You\'ll be notified if a seat opens.'
        : 'Registered successfully!')
      setShowConfirm(false)
      qc.invalidateQueries(['event', id])
      qc.invalidateQueries(['reg-status', id])
      qc.invalidateQueries(['registrations', 'my'])
    },
    onError: (err) => {
      setShowConfirm(false)
      toast.error(err.response?.data?.message ?? 'Registration failed')
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => userApi.toggleBookmark(id),
    onSuccess:  (res) => {
      toast.success(res.data.data.bookmarked ? 'Bookmarked' : 'Bookmark removed')
      qc.invalidateQueries(['bookmarks'])
    },
  })

  const addTeamMember = () => {
    if (teamMembers.length < (event?.maxTeamSize ?? 1) - 1)
      setTeamMembers((p) => [...p, { name: '', email: '' }])
  }

  const updateMember = (i, field, val) =>
    setTeamMembers((p) => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  const removeMember = (i) =>
    setTeamMembers((p) => p.filter((_, idx) => idx !== i))

  if (isLoading)
    return (
      <div className="max-w-4xl space-y-4">
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
        <div className="h-96 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    )

  if (!event)
    return <div className="text-center text-muted py-20">Event not found.</div>

  const seatsLeft      = event.totalSeats - event.registeredCount
  const isFull         = seatsLeft <= 0
  const deadlinePassed = new Date() > new Date(event.registrationDeadline)
  const isOpen         = event.status === 'approved' && !deadlinePassed
  const isRegistered   = regStatus?.isRegistered
  const regState       = regStatus?.registration?.status // 'confirmed' | 'waitlisted' | 'cancelled'

  // Determine CTA state
  const getCtaState = () => {
    if (isRegistered && regState === 'confirmed')
      return { label: 'Registered ✓', disabled: true, variant: 'secondary' }
    if (isRegistered && regState === 'waitlisted')
      return { label: 'On Waitlist', disabled: true, variant: 'secondary' }
    if (!isOpen)
      return { label: 'Registration Closed', disabled: true, variant: 'secondary' }
    if (isFull)
      return { label: 'Join Waitlist', disabled: false, variant: 'primary' }
    return { label: 'Register Now', disabled: false, variant: 'primary' }
  }

  const cta = getCtaState()

  const handleRegisterClick = () => {
    if (event.isTeamEvent && !teamName.trim()) {
      toast.error('Please enter your team name')
      return
    }
    setShowConfirm(true)
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Banner */}
      {event.bannerImage && (
        <div className="aspect-video rounded-xl overflow-hidden border border-border">
          <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main content ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Title card */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[event.type] ?? TYPE_COLORS.other}`}>
                  {event.type}
                </span>
                <h1 className="text-xl font-bold text-ink leading-snug">{event.title}</h1>
              </div>
              <button
                onClick={() => bookmarkMutation.mutate()}
                className="p-2 rounded-lg hover:bg-canvas text-muted hover:text-brand-600 transition-colors shrink-0"
                title="Bookmark event"
              >
                {bookmarkMutation.isPending
                  ? <BookmarkCheck size={20} className="text-brand-600" />
                  : <Bookmark size={20} strokeWidth={1.75} />}
              </button>
            </div>

            {event.college?.name && (
              <p className="text-sm text-muted">
                Organized by{' '}
                <span className="font-medium text-ink-soft">{event.college.name}</span>
              </p>
            )}

            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {event.tags.map((t) => (
                  <span key={t} className="text-xs bg-canvas border border-border px-2.5 py-1 rounded-full text-muted">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prizes */}
          {event.prizes?.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Trophy size={15} className="text-amber-500" /> Prizes
              </h3>
              <div className="space-y-2">
                {event.prizes.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-soft">{p.position}</span>
                    <span className="text-ink">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eligibility */}
          {(event.eligibility?.branches?.length > 0 || event.eligibility?.otherCriteria) && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <AlertCircle size={15} className="text-brand-500" /> Eligibility
              </h3>
              <div className="space-y-1.5 text-sm text-ink-soft">
                {event.eligibility.minYear && (
                  <p>Year: {event.eligibility.minYear}
                    {event.eligibility.maxYear ? ` – ${event.eligibility.maxYear}` : '+'}
                  </p>
                )}
                {event.eligibility.branches?.length > 0 && (
                  <p>Branches: {event.eligibility.branches.join(', ')}</p>
                )}
                {event.eligibility.otherCriteria && (
                  <p>{event.eligibility.otherCriteria}</p>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          {(event.brochurePdf || event.rulebookPdf || event.workshopMaterials?.length > 0) && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-ink mb-3">Event Documents</h3>
              <div className="space-y-2.5">
                {event.brochurePdf && (
                  <a href={event.brochurePdf} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                    <Download size={14} /> Download Brochure
                  </a>
                )}
                {event.rulebookPdf && (
                  <a href={event.rulebookPdf} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                    <Download size={14} /> Download Rulebook
                  </a>
                )}
                {event.workshopMaterials?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                    <Download size={14} /> Workshop Material {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: registration panel ──────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4 sticky top-6">

            {/* Already registered banner */}
            {isRegistered && regState !== 'cancelled' && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                regState === 'confirmed'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                <CheckCircle2 size={15} />
                {regState === 'confirmed' ? 'You are registered' : 'You are on the waitlist'}
              </div>
            )}

            {/* Seat bar */}
            <SeatBar registered={event.registeredCount} total={event.totalSeats} />

            <hr className="border-border" />

            {/* Event meta */}
            <div className="space-y-3 text-sm text-ink-soft">
              <div className="flex items-start gap-2.5">
                <Calendar size={15} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="font-medium text-ink">{fmt(event.startDate)}</p>
                  <p className="text-xs text-muted">{fmtTime(event.startDate)}</p>
                  {event.endDate !== event.startDate && (
                    <p className="text-xs text-muted">to {fmt(event.endDate)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="shrink-0 text-muted" />
                <span>{event.isOnline ? 'Online Event' : (event.venue || 'Venue TBA')}</span>
              </div>
              {event.isTeamEvent && (
                <div className="flex items-center gap-2.5">
                  <Users size={15} className="shrink-0 text-muted" />
                  <span>Team: {event.minTeamSize}–{event.maxTeamSize} members</span>
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Fee + deadline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Registration Fee</span>
                <span className={`font-semibold ${event.isFree ? 'text-success' : 'text-ink'}`}>
                  {event.isFree ? 'Free' : `₹${event.fee}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Deadline</span>
                <span className="text-ink-soft text-xs">{fmt(event.registrationDeadline)}</span>
              </div>
              {isOpen && !isRegistered && (
                <div className="flex items-center gap-1.5 text-xs text-warning">
                  <Clock size={12} />
                  <span>{countdown}</span>
                </div>
              )}
            </div>

            {/* Team form */}
            {event.isTeamEvent && isOpen && !isRegistered && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Team Details</p>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name *"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted">You (Leader) + {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}</p>
                  {teamMembers.map((m, i) => (
                    <TeamMemberRow
                      key={i} index={i} member={m}
                      onChange={updateMember} onRemove={removeMember}
                    />
                  ))}
                  {teamMembers.length < (event.maxTeamSize - 1) && (
                    <button
                      type="button"
                      onClick={addTeamMember}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      + Add member
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <Button
              className="w-full"
              variant={cta.variant}
              disabled={cta.disabled}
              loading={registerMutation.isPending}
              onClick={handleRegisterClick}
            >
              {cta.label}
            </Button>

            {event.externalLink && (
              <a href={event.externalLink} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:underline">
                <ExternalLink size={12} /> Official Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmModal
          event={event}
          teamName={teamName}
          teamMembers={teamMembers}
          loading={registerMutation.isPending}
          onConfirm={() => registerMutation.mutate()}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}

export default EventDetailPage
