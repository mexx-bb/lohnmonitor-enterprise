import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  Menu,
  X,
  User
} from 'lucide-react'
import { useState } from 'react'

export default function Navigation() {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/employees', label: 'Mitarbeiter', icon: Users },
    ...(isAdmin ? [{ path: '/settings', label: 'Einstellungen', icon: Settings }] : [])
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-primary-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">L</span>
              </div>
              <span className="font-bold text-xl hidden sm:block">Lohnmonitor</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path) 
                    ? 'bg-primary-800 text-white' 
                    : 'hover:bg-primary-600'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-primary-800 rounded-lg">
              <User size={18} />
              <span className="text-sm">
                {user?.username}
                <span className="ml-2 text-xs opacity-75">({user?.role})</span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Abmelden</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-primary-600"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary-800 pb-4">
          <div className="px-4 space-y-2">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path) 
                    ? 'bg-primary-900 text-white' 
                    : 'hover:bg-primary-700'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            ))}
            <hr className="border-primary-600" />
            <div className="flex items-center space-x-2 px-3 py-2 text-sm opacity-75">
              <User size={18} />
              <span>{user?.username} ({user?.role})</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-primary-700 w-full text-left"
            >
              <LogOut size={18} />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
