import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi, userApi } from '../api/services'
import { setAccessToken } from '../api/axios'
import useAuthStore from '../store/authStore'

export const useAuth = () => {
  const { user, isLoading, setAuth, clearAuth, setLoading } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials)
    const { accessToken: token, user: userData } = data.data
    if (userData.role !== 'superadmin')
      throw new Error('Access denied. Super Admin accounts only.')
    setAccessToken(token)
    setAuth(userData, token)
    navigate('/dashboard')
  }, [setAuth, navigate])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch (_) {}
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  const restoreSession = useCallback(async () => {
    setLoading(true)
    try {
      const { data: refreshData } = await authApi.refresh()
      const token = refreshData.data.accessToken
      setAccessToken(token)  // must set before getMe() so the header is present
      const { data: meData } = await userApi.getMe()
      const u = meData.data
      if (u.role !== 'superadmin') { clearAuth(); return }
      setAuth(u, token)
    } catch (_) {
      clearAuth()
    }
  }, [setAuth, clearAuth, setLoading])

  return { user, isLoading, login, logout, restoreSession }
}
