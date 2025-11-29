import { useState, useEffect, createContext, useContext } from 'react'

// Auth Context
const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check session on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Anmeldung fehlgeschlagen')
    }

    setUser(data.user)
    return data
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
  }

  async function changePassword(currentPassword, newPassword) {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Passwortänderung fehlgeschlagen')
    }

    return data
  }

  const isAdmin = user?.role === 'Admin'
  const isEditor = user?.role === 'Admin' || user?.role === 'Editor'
  const isViewer = user?.role === 'Viewer'

  const value = {
    user,
    loading,
    login,
    logout,
    changePassword,
    checkAuth,
    isAdmin,
    isEditor,
    isViewer,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
