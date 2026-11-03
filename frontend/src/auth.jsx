// Keeps track of who is logged in, and shares it with every page.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  // True after the user clicks "Log out", so pages don't ask to be returned to after the next login
  const [loggedOut, setLoggedOut] = useState(false)

  // Reload the logged-in user (e.g. after a top-up or purchase, to update the balance)
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return null
    }
    try {
      const me = await api('/users/me')
      setUser(me)
      return me
    } catch {
      setUser(null)
      return null
    }
  }, [])

  // On first load: if a token was saved earlier, find out who it belongs to
  useEffect(() => {
    if (!getToken()) return
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  // api.js fires this when the token stops working
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth-expired', onExpired)
    return () => window.removeEventListener('auth-expired', onExpired)
  }, [])

  const login = useCallback(
    async (email, password) => {
      // fastapi_users expects form fields called username and password
      const data = await api('/auth/jwt/login', {
        method: 'POST',
        form: { username: email, password },
      })
      setToken(data.access_token)
      setLoggedOut(false)
      return refreshUser()
    },
    [refreshUser],
  )

  const register = useCallback(
    async ({ name, email, password, isSeller }) => {
      await api('/auth/register', {
        method: 'POST',
        body: { name, email, password, is_seller: isSeller },
      })
      return login(email, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    clearToken()
    setLoggedOut(true)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, loggedOut, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
