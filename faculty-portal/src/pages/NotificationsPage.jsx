import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/services'
import PageHeader from '../components/shared/PageHeader'
import Button from '../components/shared/Button'

const TYPE_META = {
  registration_confirmed: { icon: '✅', label: 'Registration' },
  registration_cancelled: { icon: '❌', label: 'Cancelled'    },
  event_published:        { icon: '📅', label: 'New Event'    },
  event_updated:          { icon: '📝', label: 'Event Update' },
  event_cancelled:        { icon: '🚫', label: 'Cancelled'    },
  event_reminder:         { icon: '⏰', label: 'Reminder'     },
  announcement:           { icon: '📢', label: 'Announcement' },
  college_approved:       { icon: '🏫', label: 'College'      },
  college_rejected:       { icon: '🚫', label: 'College'      },
  account_suspended:      { icon: '🔒', label: 'Account'      },
  account_reactivated:    { icon: '🔓', label: 'Account'      },
}

const getMeta = (type) =>
  TYPE_META[type] ?? { icon: '🔔', label: 'Notification' }

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const TABS = [
  { key: 'all',    label: 'All'    },
  { key: 'unread', label: 'Unread' },
]

const NotificationsPage = () => {
  const [tab, setTab] = useState('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () =>
      notificationApi.getAll(tab === 'unread' ? { unreadOnly: 'true' } : {})
        .then((r) => r.data),
  })

  const markRead = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const markAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const notifications = data?.data ?? []
  const unreadCount   = data?.pagination?.unreadCount ?? notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        />
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAll.mutate()}>
            <CheckCheck size={14} className="mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-brand-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-16 text-center">
          <Bell size={32} className="text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = getMeta(n.type)
            return (
              <div
                key={n._id}
                onClick={() => !n.read && markRead.mutate(n._id)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  n.read
                    ? 'bg-surface border-border hover:border-gray-300'
                    : 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                }`}
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.read ? 'text-ink-soft' : 'text-ink font-semibold'}`}>
                      {n.title}
                    </p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-subtle mt-1">{fmt(n.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
