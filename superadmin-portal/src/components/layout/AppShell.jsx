import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, CalendarDays,
  ScrollText, ChevronDown, LogOut, UserCircle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/colleges',  icon: Building2,       label: 'Colleges'         },
  { to: '/events',    icon: CalendarDays,    label: 'Event Moderation' },
  { to: '/users',     icon: Users,           label: 'Users'            },
  { to: '/logs',      icon: ScrollText,      label: 'Audit Logs'       },
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
      <span className="text-xs text-subtle uppercase tracking-widest">Super Admin</span>
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
