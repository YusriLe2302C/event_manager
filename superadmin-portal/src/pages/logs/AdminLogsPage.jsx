import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/services'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'

const SEVERITY_BADGE = {
  info:    'bg-blue-100 text-blue-700',
  warning: 'bg-yellow-100 text-yellow-800',
  error:   'bg-red-100 text-red-700',
  critical:'bg-red-200 text-red-900',
}

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

const SEVERITY_TABS = [
  { key: '',        label: 'All'      },
  { key: 'info',    label: 'Info'     },
  { key: 'warning', label: 'Warning'  },
  { key: 'error',   label: 'Error'    },
]

const AdminLogsPage = () => {
  const [severity, setSeverity] = useState('')
  const [page, setPage]         = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', severity, page],
    queryFn: () =>
      adminApi.getLogs({ severity: severity || undefined, page, limit: 30 })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const logs       = data?.data ?? []
  const pagination = data?.pagination ?? {}
  const totalPages = pagination.pages ?? 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable record of all admin actions"
      />

      {/* Severity filter */}
      <div className="flex gap-1">
        {SEVERITY_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setSeverity(key); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              severity === key
                ? 'bg-brand-50 text-brand-700'
                : 'text-muted hover:text-ink hover:bg-canvas'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-muted text-sm">No logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  {['Action', 'Performed By', 'Target', 'Severity', 'IP', 'Time'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-canvas transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink text-xs font-mono">{log.action}</p>
                      {log.description && (
                        <p className="text-xs text-muted mt-0.5 max-w-xs truncate">{log.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      <p className="font-medium text-ink">{log.performedBy?.name ?? '—'}</p>
                      <p>{log.performedBy?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {log.targetType && (
                        <span className="font-medium text-ink-soft">{log.targetType}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[log.severity] ?? SEVERITY_BADGE.info}`}>
                        {log.severity ?? 'info'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fmt(log.createdAt)}</td>
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
    </div>
  )
}

export default AdminLogsPage
