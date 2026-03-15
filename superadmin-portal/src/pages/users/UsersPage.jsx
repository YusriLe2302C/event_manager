import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import toast from 'react-hot-toast'

const ROLE_BADGE = {
  student:    'bg-blue-100 text-blue-800',
  faculty:    'bg-purple-100 text-purple-800',
  superadmin: 'bg-red-100 text-red-800',
}

const STATUS_BADGE = {
  true:  'bg-green-100 text-green-700',
  false: 'bg-gray-100 text-gray-500',
}

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const ROLE_TABS = [
  { key: '',          label: 'All'        },
  { key: 'student',   label: 'Students'   },
  { key: 'faculty',   label: 'Faculty'    },
]

const UsersPage = () => {
  const qc = useQueryClient()
  const [role, setRole]     = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)
  const [suspendModal, setSuspendModal] = useState(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search, page],
    queryFn: () =>
      adminApi.getUsers({ role: role || undefined, search: search || undefined, page, limit: 20 })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.toggleUserStatus(id, { reason }),
    onSuccess: () => {
      toast.success('User status updated')
      qc.invalidateQueries(['admin-users'])
      setSuspendModal(null)
      setReason('')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Action failed'),
  })

  const users      = data?.data ?? []
  const pagination = data?.pagination ?? {}
  const totalPages = pagination.pages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle={`${pagination.total ?? 0} total users`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 border-b border-border sm:border-none">
          {ROLE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setRole(key); setPage(1) }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                role === key
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-muted hover:text-ink hover:bg-canvas'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-muted text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  {['Name', 'Email', 'Role', 'College', 'Status', 'Joined', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{u.college?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[String(u.isActive)]}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'superadmin' && (
                        <Button
                          size="sm"
                          variant={u.isActive ? 'danger' : 'secondary'}
                          onClick={() => {
                            if (u.isActive) {
                              setSuspendModal(u)
                            } else {
                              toggleMutation.mutate({ id: u._id })
                            }
                          }}
                        >
                          {u.isActive ? 'Suspend' : 'Reactivate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

      {/* Suspend modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-ink mb-1">Suspend User</h3>
            <p className="text-sm text-muted mb-4">
              Suspending <strong>{suspendModal.name}</strong>. Provide an optional reason.
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)..."
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setSuspendModal(null); setReason('') }}>
                Cancel
              </Button>
              <Button
                variant="danger" size="sm"
                loading={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ id: suspendModal._id, reason })}
              >
                Confirm Suspension
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
