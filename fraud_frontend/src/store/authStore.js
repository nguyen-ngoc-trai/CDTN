import { create } from 'zustand'
import { authApi } from '../api/client'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true })
    try {
      const { data } = await authApi.login(username, password)
      localStorage.setItem('token', data.access_token)
      set({ user: data.user, token: data.access_token, isLoading: false })
      return true
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    try {
      const { data } = await authApi.me()
      set({ user: data })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },
}))
