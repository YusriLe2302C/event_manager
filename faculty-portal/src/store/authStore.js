import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '../api/axios'

const useAuthStore = create((set) => ({
  user:        null,
  accessToken: null,
  isLoading:   true,

  setAuth: (user, token) => {
    setAccessToken(token)
    set({ user, accessToken: token, isLoading: false })
  },

  clearAuth: () => {
    clearAccessToken()
    set({ user: null, accessToken: null, isLoading: false })
  },

  setLoading: (v) => set({ isLoading: v }),
}))

export default useAuthStore
