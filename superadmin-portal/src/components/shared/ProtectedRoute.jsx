import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

// Spinner shown while session is being restored
const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-canvas">
    <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

/**
 * @param {string[]} allowedRoles - if empty, any authenticated user passes
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <Spinner />

  if (!user)
    return <Navigate to="/login" state={{ from: location }} replace />

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role))
    return <Navigate to="/unauthorized" replace />

  return <Outlet />
}

export default ProtectedRoute
