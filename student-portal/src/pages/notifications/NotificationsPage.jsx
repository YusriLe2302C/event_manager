import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import PageHeader from '../../components/shared/PageHeader'
import Button from '../../components/shared/Button'

// ── Type metadata ──────────────────────────────────────────────────
const TYPE_META = {
  registration_confirmed: { icon: '✅', label: 'Registration',  bg: 'bg-green-50',  border: 'border-green-100' },
  registration_cancelled: { icon: '❌', label: 'Cancelled',     bg: 'bg-red-50',    border: 'border-red-100'   },
  event_published:        { icon: '📅', label: 'New Event',     bg: 'bg-blue-50',   border: 'border-blue-100'  },
  event_updated:          { icon: '📝', label: 'Event Update',  bg: 'bg-yellow-50', border: 'border-yellow-100'},
  event_cancelled:        { icon: '🚫', label: 'Cancelled',     bg: 'bg-red-50',    border: 'border-red-100'   },
  event_reminder:         { icon: '⏰', label: 'Reminder',      bg: 'bg-orange-50', border: 'border-orange-100'},
  announcement:           { icon: '📢', label: 'Announcement',  bg: 'bg-blue-50',   border: 'border-blue-100'  },
  college_approved:       { icon: '🏫', label: 'College',       bg: 'bg-green-50',  border: 'border-green-100' },
  college_rejected:       { icon: '🚫', label: 'College',       bg: 'bg-red-50',    border: 'border-red-100'   },
  account_suspended:      { icon: '🔒', label: 'Account',       bg: 'bg-red-50',    border: 'border-red-100'   },
  account_reactivated:    { icon: '🔓', label: 'Account',       bg: 'bg-green-50',  border: 'border-green-100' },
}

const getMeta = (type) =>
  TYPE_META[type] ?? { icon: '🔔', label: 'Notification', bg: 'bg-gray-50', border: 'border-gray-100' }

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

// ── Filter tabs ────────────────────────────────────────────────────
const TABS = [
  { key: 'all',    label: 'All' },
  { key: 'unread', label: 'Unread' },
]

// ── Single notification card ───────────────────────────────────────
const NotifCard = ({ n, onRead, onDelete }) => {
  const navigate = useNavigate()
  const meta = getMeta(n.type)

  const handleClick = () => {
    if (!n.read) onRead(n._id)
    if (n.actionUrl) navigate(n.actionUrl)
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer
        transition-all duration-150
        ${n.read
          ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          : 'bg-[#eff6ff]/50 border-[#bfdbfe] hover:bg-[#eff6ff] hover:border-[#93c5fd]'
        }`}
    >
      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${meta.bg} border ${meta.border}`}>
        {meta.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm leading-snug ${n.read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
              {n.title}
            </p>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
              ${meta.bg} text-gray-600 border ${meta.border}`}>
              {meta.label}
            </span>
          </div>
          {!n.read && (
            <div className="w-2 h-2 rounded-full bg-[#1e3a8a] shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
        <p className="text-[11px] text-gray-400 mt-1.5">{fmt(n.createdAt)}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(n._id) }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity
          p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
        title="Delete notification"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const [tab, setTab] = useState('all')

  const { notifications, unreadCount, isLoading, markRead, markAllRead, remove } =
    useNotifications(tab === 'unread' ? { unreadOnly: 'true' } : {})

  const displayed = tab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={() => markAllRead()}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          )
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${tab === t.key
                ? 'border-[#1e3a8a] text-[#1e3a8a]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {t.label}
            {t.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#1e3a8a] text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <Bell size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === 'unread' ? "You're all caught up!" : 'Notifications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => (
            <NotifCard
              key={n._id}
              n={n}
              onRead={markRead}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
