import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarSearch, BookmarkCheck,
  ClipboardList, Bell, UserCircle,
} from 'lucide-react'

const links = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/events',         icon: CalendarSearch,  label: 'Browse Events'  },
  { to: '/my-registrations', icon: ClipboardList, label: 'My Registrations'},
  { to: '/bookmarks',      icon: BookmarkCheck,   label: 'Bookmarks'      },
  { to: '/notifications',  icon: Bell,            label: 'Notifications'  },
  { to: '/profile',        icon: UserCircle,      label: 'Profile'        },
]

const Sidebar = () => (
  <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col">
    {/* Logo */}
    <div className="h-16 flex items-center px-6 border-b border-border">
      <span className="text-brand-700 font-semibold text-lg tracking-tight">
        CampusConnect
      </span>
    </div>

    {/* Nav */}
    <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-soft hover:bg-canvas hover:text-ink'
            }`
          }
        >
          <Icon size={18} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>

    {/* Portal label */}
    <div className="px-6 py-4 border-t border-border">
      <span className="text-xs text-subtle uppercase tracking-widest">Student Portal</span>
    </div>
  </aside>
)

export default Sidebar
