import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const GuestRoute = () => {
  const { user, isLoading } = useAuthStore()

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default GuestRoute
