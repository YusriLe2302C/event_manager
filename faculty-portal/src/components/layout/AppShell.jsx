import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, PlusCircle, BarChart2,
  Building2, Bell, ChevronDown, LogOut, UserCircle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/events',     icon: CalendarDays,    label: 'My Events'   },
  { to: '/events/create', icon: PlusCircle,   label: 'Create Event'},
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics'   },
  { to: '/college',    icon: Building2,       label: 'College'     },
  { to: '/notifications', icon: Bell,         label: 'Notifications'},
]

const Sidebar = () => (
  <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col">
    <div className="h-16 flex items-center px-6 border-b border-border">
      <span className="text-brand-700 font-semibold text-lg tracking-tight">CampusConnect</span>
    </div>
    <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/events'}
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
    <div className="px-6 py-4 border-t border-border">
      <span className="text-xs text-subtle uppercase tracking-widest">Faculty Portal</span>
    </div>
  </aside>
)

const Topbar = () => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-3 shrink-0">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-gray-800"
        >
          <UserCircle size={22} strokeWidth={1.5} className="text-brand-700" />
          <span className="max-w-[120px] truncate">{user?.name}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Bell size={16} /> Notifications
            </Link>
            <hr className="my-1 border-gray-100" />
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

const AppShell = () => (
  <div className="flex h-screen overflow-hidden bg-canvas">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  </div>
)

export default AppShell
