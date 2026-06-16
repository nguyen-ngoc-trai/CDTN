import { createContext, useContext, useState, useCallback } from 'react'
import { loginApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('fs_auth')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (username, password) => {
    const data = await loginApi(username, password)
    const session = {
      token:    data.access_token,
      role:     data.role,
      username: data.username,
    }
    localStorage.setItem('fs_auth', JSON.stringify(session))
    setAuth(session)
    return session
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fs_auth')
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
