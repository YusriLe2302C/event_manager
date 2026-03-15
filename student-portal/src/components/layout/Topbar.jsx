import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import NotificationDropdown from '../notifications/NotificationDropdown'

const Topbar = () => {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-3 shrink-0">
      {/* Notification bell + dropdown */}
      <NotificationDropdown />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100
            transition-colors text-sm font-medium text-gray-800"
        >
          <UserCircle size={22} strokeWidth={1.5} className="text-[#1e3a8a]" />
          <span className="max-w-[120px] truncate">{user?.name}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200
            rounded-xl shadow-lg py-1 z-50">
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserCircle size={16} /> View Profile
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

export default Topbar
