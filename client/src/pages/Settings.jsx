import { useState, useEffect } from 'react'
import { useApi, formatDate } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import { 
  Settings as SettingsIcon, 
  Users, 
  Bell, 
  Mail, 
  Save,
  Plus,
  Trash2,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react'

export default function Settings() {
  const { get, post, put, del, loading, error: apiError } = useApi()
  const { user, changePassword, isAdmin } = useAuth()
  
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // User form
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'Viewer',
    departmentAccess: ''
  })

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (isAdmin) {
      loadSettings()
      loadUsers()
      loadAuditLogs()
    }
  }, [isAdmin])

  const loadSettings = async () => {
    try {
      const data = await get('/api/admin/settings')
      setSettings(data.settings || {})
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await get('/api/admin/users')
      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const data = await get('/api/admin/audit-log?limit=50')
      setAuditLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    }
  }

  const handleSaveSettings = async () => {
    try {
      await put('/api/admin/settings', { settings })
      setSuccessMessage('Einstellungen gespeichert')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err.message)
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    try {
      if (editingUser) {
        const data = { ...userForm }
        if (!data.password) delete data.password
        await put(`/api/admin/users/${editingUser.id}`, data)
        setSuccessMessage('Benutzer aktualisiert')
      } else {
        await post('/api/admin/users', userForm)
        setSuccessMessage('Benutzer erstellt')
      }

      setShowUserForm(false)
      setEditingUser(null)
      setUserForm({ username: '', password: '', role: 'Viewer', departmentAccess: '' })
      loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err.message)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Benutzer wirklich löschen?')) return

    try {
      await del(`/api/admin/users/${userId}`)
      setSuccessMessage('Benutzer gelöscht')
      loadUsers()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err.message)
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  const handleEditUser = (user) => {
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      departmentAccess: user.departmentAccess || ''
    })
    setEditingUser(user)
    setShowUserForm(true)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('Passwörter stimmen nicht überein')
      return
    }

    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setSuccessMessage('Passwort erfolgreich geändert')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err.message)
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  const handleTestEmail = async () => {
    try {
      const result = await post('/api/admin/test-email', {})
      if (result.success) {
        setSuccessMessage('E-Mail-Verbindung erfolgreich')
      } else {
        setErrorMessage(result.message || 'E-Mail-Test fehlgeschlagen')
      }
      setTimeout(() => {
        setSuccessMessage('')
        setErrorMessage('')
      }, 5000)
    } catch (err) {
      setErrorMessage(err.message)
      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="card text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-semibold text-gray-700">Zugriff verweigert</h2>
          <p className="text-gray-500 mt-2">
            Dieser Bereich ist nur für Administratoren zugänglich.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-600">Systemkonfiguration und Benutzerverwaltung</p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success flex items-center gap-2 mb-4">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error flex items-center gap-2 mb-4">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {[
          { id: 'general', label: 'Allgemein', icon: SettingsIcon },
          { id: 'users', label: 'Benutzer', icon: Users },
          { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
          { id: 'audit', label: 'Audit-Log', icon: FileText },
          { id: 'password', label: 'Passwort', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Allgemeine Einstellungen</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label">Firmenname</label>
              <input
                type="text"
                value={settings.firma_name || ''}
                onChange={(e) => setSettings({...settings, firma_name: e.target.value})}
                className="input"
              />
            </div>

            <div>
              <label className="label">Firmenadresse</label>
              <input
                type="text"
                value={settings.firma_adresse || ''}
                onChange={(e) => setSettings({...settings, firma_adresse: e.target.value})}
                className="input"
              />
            </div>

            <div>
              <label className="label">Basis-Wochenstunden</label>
              <input
                type="number"
                value={settings.basis_wochenstunden || 40}
                onChange={(e) => setSettings({...settings, basis_wochenstunden: e.target.value})}
                className="input"
                step="0.5"
                min="20"
                max="48"
              />
              <p className="text-xs text-gray-500 mt-1">
                Für anteilige Zulagenberechnung
              </p>
            </div>

            <div>
              <label className="label">Alarm-Schwellenwert (Tage)</label>
              <input
                type="number"
                value={settings.alarm_days_threshold || 40}
                onChange={(e) => setSettings({...settings, alarm_days_threshold: e.target.value})}
                className="input"
                min="1"
                max="365"
              />
              <p className="text-xs text-gray-500 mt-1">
                Stufenaufstiege innerhalb dieser Tage werden als Alarm markiert
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="btn btn-primary flex items-center gap-2"
              disabled={loading}
            >
              <Save size={18} />
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Benutzerverwaltung</h2>
            <button
              onClick={() => {
                setShowUserForm(true)
                setEditingUser(null)
                setUserForm({ username: '', password: '', role: 'Viewer', departmentAccess: '' })
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Neuer Benutzer
            </button>
          </div>

          {/* User Form Modal */}
          {showUserForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
                  </h3>
                  <button onClick={() => setShowUserForm(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="label">Benutzername *</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">
                      Passwort {editingUser ? '(leer = unverändert)' : '*'}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      className="input"
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="label">Rolle *</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                      className="input"
                      required
                    >
                      <option value="Viewer">Viewer (nur Lesen)</option>
                      <option value="Editor">Editor (Bearbeiten)</option>
                      <option value="Admin">Admin (Vollzugriff)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Abteilungszugriff</label>
                    <input
                      type="text"
                      value={userForm.departmentAccess}
                      onChange={(e) => setUserForm({...userForm, departmentAccess: e.target.value})}
                      className="input"
                      placeholder="z.B. Pflege,Ambulant"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Komma-getrennt. Leer = alle Abteilungen
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="btn btn-secondary"
                    >
                      Abbrechen
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Speichere...' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Benutzername</th>
                  <th>Rolle</th>
                  <th>Abteilungen</th>
                  <th>Status</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.username}</td>
                    <td>
                      <span className={`badge ${
                        u.role === 'Admin' ? 'badge-red' : 
                        u.role === 'Editor' ? 'badge-yellow' : 'badge-blue'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-gray-600">{u.departmentAccess || 'Alle'}</td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>
                        {u.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">E-Mail Benachrichtigungen</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="text-yellow-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-yellow-800">SMTP-Konfiguration</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Die E-Mail-Einstellungen werden in der Server .env Datei konfiguriert.
                  Ändern Sie dort die SMTP_* Variablen.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Aktuelle Konfiguration</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <p><strong>Status:</strong> {settings.smtp_enabled === 'true' ? 'Aktiviert' : 'Deaktiviert'}</p>
                <p><strong>Host:</strong> {settings.smtp_host || 'Nicht konfiguriert'}</p>
                <p><strong>Empfänger:</strong> {settings.smtp_to || 'Nicht konfiguriert'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Test</h3>
              <p className="text-sm text-gray-600 mb-3">
                Prüfen Sie die SMTP-Verbindung:
              </p>
              <button
                onClick={handleTestEmail}
                className="btn btn-secondary flex items-center gap-2"
                disabled={loading}
              >
                <Mail size={18} />
                Verbindung testen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Audit-Log</h2>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Zeitpunkt</th>
                  <th>Benutzer</th>
                  <th>Aktion</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="text-gray-500 text-sm">
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </td>
                    <td>{log.user?.username || '-'}</td>
                    <td>
                      <span className="badge badge-blue">{log.action}</span>
                    </td>
                    <td className="text-gray-600 text-sm max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Change */}
      {activeTab === 'password' && (
        <div className="card max-w-md">
          <h2 className="text-lg font-semibold mb-4">Passwort ändern</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Aktuelles Passwort</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Neues Passwort</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="input"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="label">Neues Passwort bestätigen</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="input"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              Passwort ändern
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
