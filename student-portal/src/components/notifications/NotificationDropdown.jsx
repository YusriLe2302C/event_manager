import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import useNotificationStore from '../../store/notificationStore'

// ── Type metadata ──────────────────────────────────────────────────
const TYPE_META = {
  registration_confirmed: { icon: '✅', bg: 'bg-green-50'  },
  registration_cancelled: { icon: '❌', bg: 'bg-red-50'    },
  event_published:        { icon: '📅', bg: 'bg-blue-50'   },
  event_updated:          { icon: '📝', bg: 'bg-yellow-50' },
  event_cancelled:        { icon: '🚫', bg: 'bg-red-50'    },
  event_reminder:         { icon: '⏰', bg: 'bg-orange-50' },
  announcement:           { icon: '📢', bg: 'bg-blue-50'   },
  college_approved:       { icon: '🏫', bg: 'bg-green-50'  },
  college_rejected:       { icon: '🚫', bg: 'bg-red-50'    },
  account_suspended:      { icon: '🔒', bg: 'bg-red-50'    },
  account_reactivated:    { icon: '🔓', bg: 'bg-green-50'  },
}

const getMeta = (type) =>
  TYPE_META[type] ?? { icon: '🔔', bg: 'bg-gray-50' }

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Single notification row ────────────────────────────────────────
const NotifRow = ({ n, onRead, onDelete, onNavigate }) => {
  const meta = getMeta(n.type)

  const handleClick = () => {
    if (!n.read) onRead(n._id)
    if (n.actionUrl) onNavigate(n.actionUrl)
  }

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        ${n.read ? 'hover:bg-gray-50' : 'bg-[#eff6ff]/60 hover:bg-[#eff6ff]'}`}
      onClick={handleClick}
    >
      {/* Icon bubble */}
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base ${meta.bg}`}>
        {meta.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-5">
        <p className={`text-sm leading-snug ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1e3a8a] shrink-0" />
      )}

      {/* Delete — visible on row hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(n._id) }}
        className="absolute right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity
          p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500"
        title="Delete notification"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────
const SkeletonRows = () => (
  <div className="p-4 space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/4" />
        </div>
      </div>
    ))}
  </div>
)

// ── Main dropdown ──────────────────────────────────────────────────
const NotificationDropdown = () => {
  const { isOpen, toggleOpen, closePanel } = useNotificationStore()
  const { notifications, unreadCount, isLoading, markRead, markAllRead, remove } =
    useNotifications()
  const navigate  = useNavigate()
  const panelRef  = useRef(null)
  const buttonRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (
        !panelRef.current?.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) closePanel()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, closePanel])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closePanel])

  const handleNavigate = (url) => {
    closePanel()
    navigate(url)
  }

  const preview = notifications.slice(0, 8)

  return (
    <div className="relative">
      {/* ── Bell button ── */}
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className={`relative p-2 rounded-lg transition-colors
          ${isOpen
            ? 'bg-[#eff6ff] text-[#1e3a8a]'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5
              bg-red-500 text-white text-[10px] font-bold rounded-full
              flex items-center justify-center leading-none"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-gray-200
            rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs text-[#1e3a8a] hover:text-[#1a3080]
                  font-medium px-2 py-1 rounded hover:bg-[#eff6ff] transition-colors"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {isLoading ? (
              <SkeletonRows />
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell size={28} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : (
              preview.map((n) => (
                <NotifRow
                  key={n._id}
                  n={n}
                  onRead={markRead}
                  onDelete={remove}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 shrink-0">
              <button
                onClick={() => { closePanel(); navigate('/notifications') }}
                className="w-full flex items-center justify-center gap-1.5 py-3
                  text-xs font-medium text-[#1e3a8a] hover:bg-[#eff6ff] transition-colors"
              >
                <ExternalLink size={12} /> View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
