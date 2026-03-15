import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import { Globe, Mail, Phone, MapPin, Calendar, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Status config ──────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { badge: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  verified: { badge: 'bg-green-100  text-green-800',  label: 'Verified' },
  rejected: { badge: 'bg-red-100    text-red-800',    label: 'Rejected' },
}

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Reject modal (shared for both college rejection and edit rejection) ──

const RejectModal = ({ title, subjectName, onClose, onConfirm, isPending }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="text-sm text-muted">
          Rejecting <span className="font-medium text-ink">"{subjectName}"</span>.
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
            placeholder="Explain why this is being rejected…"
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
            Reject
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── College profile drawer ─────────────────────────────────────────

const ProfileDrawer = ({ collegeId, onClose }) => {
  const { data: college, isLoading } = useQuery({
    queryKey: ['admin-college-profile', collegeId],
    queryFn:  () => adminApi.getCollegeProfile(collegeId).then((r) => r.data.data),
    enabled:  !!collegeId,
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">College Profile</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : college ? (
          <>
            <div className="flex items-start gap-4">
              {college.logoUrl ? (
                <img src={college.logoUrl} alt={college.name}
                  className="w-16 h-16 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center
                                text-brand-600 font-bold text-2xl border border-border">
                  {college.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-ink text-base">{college.name}</h3>
                <p className="text-xs text-muted capitalize">{college.type}</p>
                <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full
                  ${STATUS_CFG[college.verificationStatus]?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_CFG[college.verificationStatus]?.label ?? college.verificationStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Contact</h4>
              <div className="flex items-center gap-2 text-muted"><Mail size={13} /><span>{college.email}</span></div>
              {college.phone && <div className="flex items-center gap-2 text-muted"><Phone size={13} /><span>{college.phone}</span></div>}
              {college.website && (
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-muted" />
                  <a href={college.website} target="_blank" rel="noreferrer"
                    className="text-brand-600 hover:underline text-sm truncate">{college.website}</a>
                </div>
              )}
            </div>

            {(college.address?.city || college.address?.state) && (
              <div className="space-y-1 text-sm">
                <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Address</h4>
                <div className="flex items-start gap-2 text-muted">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  <span>
                    {[college.address.street, college.address.city,
                      college.address.state, college.address.pincode,
                      college.address.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {college.establishedYear && (
                <div>
                  <p className="text-xs text-muted">Established</p>
                  <p className="font-medium text-ink flex items-center gap-1"><Calendar size={12} />{college.establishedYear}</p>
                </div>
              )}
              {college.affiliatedTo && (
                <div>
                  <p className="text-xs text-muted">Affiliated To</p>
                  <p className="font-medium text-ink">{college.affiliatedTo}</p>
                </div>
              )}
              <div><p className="text-xs text-muted">Total Events</p><p className="font-medium text-ink">{college.totalEvents}</p></div>
              <div><p className="text-xs text-muted">Total Students</p><p className="font-medium text-ink">{college.totalStudents}</p></div>
            </div>

            {college.description && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">About</h4>
                <p className="text-sm text-muted leading-relaxed">{college.description}</p>
              </div>
            )}

            <div className="border-t border-border pt-4 text-xs text-muted space-y-1">
              <p>Submitted by <span className="font-medium text-ink">{college.createdBy?.name}</span> ({college.createdBy?.email})</p>
              <p>Registered on {fmt(college.createdAt)}</p>
              {college.verificationRejectionReason && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                  <span className="font-semibold">Rejection reason: </span>{college.verificationRejectionReason}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">College not found.</p>
        )}
      </div>
    </div>
  )
}

// ── College card (verification tab) ───────────────────────────────

const CollegeCard = ({ college, onVerify, onReject, onViewProfile }) => {
  const cfg = STATUS_CFG[college.verificationStatus] ?? STATUS_CFG.pending
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {college.logoUrl ? (
            <img src={college.logoUrl} alt={college.name}
              className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center
                            text-brand-600 font-bold text-lg shrink-0">
              {college.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-ink truncate">{college.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span className="flex items-center gap-1"><Mail size={11} />{college.email}</span>
              {college.phone && <span className="flex items-center gap-1"><Phone size={11} />{college.phone}</span>}
              {college.address?.city && <span className="flex items-center gap-1"><MapPin size={11} />{college.address.city}</span>}
            </div>
            <p className="text-xs text-muted">
              Submitted by <span className="font-medium">{college.createdBy?.name}</span>{' · '}{fmt(college.createdAt)}
            </p>
            {college.verificationRejectionReason && (
              <p className="text-xs text-red-600 mt-1">Rejected: {college.verificationRejectionReason}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onViewProfile(college._id)}>View Profile</Button>
          {college.verificationStatus === 'pending' && (
            <>
              <Button size="sm" onClick={() => onVerify(college)}>Verify</Button>
              <Button size="sm" variant="danger" onClick={() => onReject(college)}>Reject</Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit request card ──────────────────────────────────────────────

const EditCard = ({ college, onApprove, onReject, onViewProfile }) => {
  const edit = college.pendingEdit ?? {}
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink">{college.name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Edit Pending</span>
          </div>
          <p className="text-xs text-muted">
            Submitted by <span className="font-medium">{college.createdBy?.name}</span>
            {edit.submittedAt && <> · {fmt(edit.submittedAt)}</>}
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onViewProfile(college._id)}>Current Profile</Button>
          <Button size="sm" onClick={() => onApprove(college)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => onReject(college)}>Reject</Button>
        </div>
      </div>

      {/* Diff: show what changed */}
      <div className="bg-gray-50 border border-border rounded-lg p-3 text-xs space-y-1">
        <p className="font-semibold text-ink-soft uppercase tracking-wide mb-2">Requested Changes</p>
        {[
          ['Name',        college.name,        edit.name],
          ['Email',       college.email,       edit.email],
          ['Phone',       college.phone,       edit.phone],
          ['Website',     college.website,     edit.website],
          ['Description', college.description, edit.description],
        ].map(([label, current, proposed]) =>
          proposed && proposed !== current ? (
            <div key={label} className="grid grid-cols-3 gap-2">
              <span className="text-muted font-medium">{label}</span>
              <span className="text-red-600 line-through truncate">{current || '—'}</span>
              <span className="text-green-700 font-medium truncate">{proposed}</span>
            </div>
          ) : null
        )}
        {edit.logoUrl && edit.logoUrl !== college.logoUrl && (
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted font-medium">Logo</span>
            <span className="text-red-600 line-through">current logo</span>
            <span className="text-green-700 font-medium">new logo uploaded</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────

const TABS = [
  { key: 'pending',  label: 'Pending Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'edits',    label: 'Pending Edits' },
]

const CollegeVerificationPage = () => {
  const qc = useQueryClient()
  const [tab, setTab]               = useState('pending')
  const [page, setPage]             = useState(1)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectMode, setRejectMode] = useState(null) // 'college' | 'edit'
  const [profileId, setProfileId]   = useState(null)

  // Verification list query
  const { data: verifyData, isLoading: verifyLoading } = useQuery({
    queryKey: ['admin-colleges', tab, page],
    queryFn:  () =>
      adminApi.getPendingColleges({ verificationStatus: tab, page, limit: 15 })
        .then((r) => r.data),
    keepPreviousData: true,
    enabled: tab !== 'edits',
  })

  // Pending edits query
  const { data: editsData, isLoading: editsLoading } = useQuery({
    queryKey: ['admin-college-edits', page],
    queryFn:  () => adminApi.getPendingCollegeEdits({ page, limit: 15 }).then((r) => r.data),
    keepPreviousData: true,
    enabled: tab === 'edits',
  })

  const verifyMutation = useMutation({
    mutationFn: (id) => adminApi.verifyCollege(id),
    onSuccess: () => {
      toast.success('College verified — faculty can now create events')
      qc.invalidateQueries(['admin-colleges'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Verification failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectCollege(id, { reason }),
    onSuccess: () => {
      toast.success('College rejected — faculty has been notified')
      setRejectTarget(null)
      qc.invalidateQueries(['admin-colleges'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Rejection failed'),
  })

  const approveEditMutation = useMutation({
    mutationFn: (id) => adminApi.approveCollegeEdit(id),
    onSuccess: () => {
      toast.success('Edit approved — college updated')
      qc.invalidateQueries(['admin-college-edits'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Approval failed'),
  })

  const rejectEditMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectCollegeEdit(id, { reason }),
    onSuccess: () => {
      toast.success('Edit rejected — faculty has been notified with reason')
      setRejectTarget(null)
      qc.invalidateQueries(['admin-college-edits'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Rejection failed'),
  })

  const isEditsTab   = tab === 'edits'
  const isLoading    = isEditsTab ? editsLoading : verifyLoading
  const colleges     = isEditsTab ? (editsData?.data ?? []) : (verifyData?.data ?? [])
  const totalPages   = isEditsTab ? (editsData?.pagination?.pages ?? 1) : (verifyData?.pagination?.pages ?? 1)

  const handleReject = (college, mode) => {
    setRejectTarget(college)
    setRejectMode(mode)
  }

  const handleRejectConfirm = (reason) => {
    if (rejectMode === 'edit') {
      rejectEditMutation.mutate({ id: rejectTarget._id, reason })
    } else {
      rejectMutation.mutate({ id: rejectTarget._id, reason })
    }
  }

  const rejectIsPending = rejectMode === 'edit' ? rejectEditMutation.isPending : rejectMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title="College Verification"
        subtitle="Verify colleges and review edit requests"
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : colleges.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">
          No {tab === 'edits' ? 'pending edit requests' : `${tab} colleges`} found.
        </div>
      ) : (
        <div className="space-y-3">
          {isEditsTab
            ? colleges.map((col) => (
                <EditCard
                  key={col._id}
                  college={col}
                  onApprove={(c) => approveEditMutation.mutate(c._id)}
                  onReject={(c) => handleReject(c, 'edit')}
                  onViewProfile={(id) => setProfileId(id)}
                />
              ))
            : colleges.map((col) => (
                <CollegeCard
                  key={col._id}
                  college={col}
                  onVerify={(c) => verifyMutation.mutate(c._id)}
                  onReject={(c) => handleReject(c, 'college')}
                  onViewProfile={(id) => setProfileId(id)}
                />
              ))
          }
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted self-center">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Profile drawer */}
      {profileId && <ProfileDrawer collegeId={profileId} onClose={() => setProfileId(null)} />}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          title={rejectMode === 'edit' ? 'Reject Edit Request' : 'Reject College'}
          subjectName={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          isPending={rejectIsPending}
        />
      )}
    </div>
  )
}

export default CollegeVerificationPage
