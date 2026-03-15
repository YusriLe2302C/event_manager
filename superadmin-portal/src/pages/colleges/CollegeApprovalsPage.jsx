import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import { CheckCircle, XCircle, Globe, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

const CollegeApprovalsPage = () => {
  const qc = useQueryClient()
  const [rejectModal, setRejectModal] = useState(null) // { id, name }
  const [reason, setReason] = useState('')

  const { data: colleges, isLoading } = useQuery({
    queryKey: ['admin', 'pending-colleges'],
    queryFn: () => adminApi.getPendingColleges(),
    select: (res) => res.data.data,
  })

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.verifyCollege(id),
    onSuccess: () => {
      toast.success('College approved successfully')
      qc.invalidateQueries(['admin', 'pending-colleges'])
      qc.invalidateQueries(['admin', 'analytics'])
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectCollege(id, { reason }),
    onSuccess: () => {
      toast.success('College rejected')
      qc.invalidateQueries(['admin', 'pending-colleges'])
      qc.invalidateQueries(['admin', 'analytics'])
      setRejectModal(null)
      setReason('')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed'),
  })

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="College Approvals"
        subtitle={`${colleges?.length ?? 0} colleges pending review`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : colleges?.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-16 text-center text-muted text-sm">
          No colleges pending approval.
        </div>
      ) : (
        <div className="space-y-3">
          {colleges.map((college) => (
            <div key={college._id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {college.logoUrl ? (
                    <img src={college.logoUrl} alt={college.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg">
                      {college.name.charAt(0)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-ink">{college.name}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1"><Mail size={11} />{college.email}</span>
                      {college.phone && <span className="flex items-center gap-1"><Phone size={11} />{college.phone}</span>}
                      {college.website && (
                        <a href={college.website} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-brand-600 hover:underline">
                          <Globe size={11} /> Website
                        </a>
                      )}
                    </div>
                    {college.description && (
                      <p className="text-xs text-muted line-clamp-2 max-w-xl">{college.description}</p>
                    )}
                    <p className="text-xs text-subtle">
                      Submitted by {college.createdBy?.name} · {new Date(college.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    loading={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(college._id)}
                  >
                    <CheckCircle size={14} /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setRejectModal({ id: college._id, name: college.name })}
                  >
                    <XCircle size={14} /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-ink mb-1">Reject College</h3>
            <p className="text-sm text-muted mb-4">
              Provide a reason for rejecting <strong>{rejectModal.name}</strong>.
              This will be sent to the faculty member.
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setRejectModal(null); setReason('') }}>
                Cancel
              </Button>
              <Button
                variant="danger" size="sm"
                loading={rejectMutation.isPending}
                disabled={!reason.trim()}
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason })}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CollegeApprovalsPage
