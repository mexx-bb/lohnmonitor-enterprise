import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogIn, AlertCircle, User, Lock } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [firmaName, setFirmaName] = useState('Lohnmonitor')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchFirmaName()
  }, [])

  const fetchFirmaName = async () => {
    try {
      const res = await fetch('/api/settings/public')
      if (res.ok) {
        const data = await res.json()
        setFirmaName(data.firma_name || 'Lohnmonitor')
      }
    } catch (err) {
      console.error('Failed to load company name:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  // Get first letter for logo
  const logoLetter = firmaName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-4xl font-bold text-primary-600">{logoLetter}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{firmaName}</h1>
          <p className="text-primary-200 mt-2">Enterprise Edition</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
            Anmelden
          </h2>

          {error && (
            <div className="alert alert-error flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Benutzername</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Benutzername eingeben"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Passwort eingeben"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-primary-200 text-sm">
          <p>{firmaName} Enterprise v3.0.0</p>
          <p className="mt-1">© 2025</p>
        </div>
      </div>
    </div>
  )
}
