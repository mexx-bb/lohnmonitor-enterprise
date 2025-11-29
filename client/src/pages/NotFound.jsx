import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
          <AlertTriangle size={40} className="text-yellow-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl text-gray-600 mb-6">Seite nicht gefunden</h2>
        
        <p className="text-gray-500 mb-8">
          Die angeforderte Seite existiert nicht.
        </p>
        
        <Link to="/" className="btn btn-primary inline-flex items-center gap-2">
          <Home size={18} />
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
