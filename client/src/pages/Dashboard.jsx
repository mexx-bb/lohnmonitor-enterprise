import { useState, useEffect } from 'react'
import { useApi, formatCurrency } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import AlarmCard from '../components/AlarmCard'
import SalaryCalculator from '../components/SalaryCalculator'
import { 
  Users, 
  AlertTriangle, 
  Bell, 
  Building, 
  TrendingUp,
  Calculator,
  RefreshCw,
  Download
} from 'lucide-react'

export default function Dashboard() {
  const { get, post, download, loading, error: apiError } = useApi()
  const { isEditor, isAdmin } = useAuth()
  
  const [summary, setSummary] = useState(null)
  const [alarms, setAlarms] = useState([])
  const [showCalculator, setShowCalculator] = useState(false)
  const [basisWochenstunden, setBasisWochenstunden] = useState(40)
  const [companyName, setCompanyName] = useState('Lohnmonitor')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [summaryData, alarmsData, publicSettings] = await Promise.all([
        get('/api/dashboard/summary'),
        get('/api/dashboard/alarms'),
        get('/api/admin/settings/public')
      ])

      setSummary(summaryData.summary)
      setAlarms(alarmsData.alarms)
      
      if (publicSettings.company_name) {
        setCompanyName(publicSettings.company_name)
      }

      // Get basis wochenstunden from settings if admin
      if (isAdmin) {
        try {
          const settings = await get('/api/admin/settings')
          if (settings.settings?.basis_wochenstunden) {
            setBasisWochenstunden(parseFloat(settings.settings.basis_wochenstunden))
          }
        } catch (e) {
          // Ignore settings error for non-admins
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    }
  }

  const handleAcknowledge = async (employeeId) => {
    try {
      await post(`/api/dashboard/alarms/${employeeId}/acknowledge`, {})
      loadData() // Reload to update status
    } catch (err) {
      console.error('Acknowledge failed:', err)
    }
  }

  const handleGeneratePdf = async (employeeId) => {
    try {
      await download(`/api/pdf/stufenaufstieg/${employeeId}`, `Stufenaufstieg_${employeeId}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
  }

  const handleTriggerCheck = async () => {
    try {
      await post('/api/admin/trigger-check', {})
      loadData()
    } catch (err) {
      console.error('Alarm check failed:', err)
    }
  }

  const activeAlarms = alarms.filter(a => !a.istBestaetigt)
  const urgentAlarms = alarms.filter(a => a.alarmLevel === 'rot' && !a.istBestaetigt)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{companyName} - Dashboard</h1>
          <p className="text-gray-600">Übersicht und Stufenaufstieg-Alarme</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Calculator size={18} />
            Gehaltsrechner
          </button>
          {isAdmin && (
            <button
              onClick={handleTriggerCheck}
              className="btn btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Prüfung starten
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Mitarbeiter</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalEmployees}</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Alarme</p>
              <p className="text-2xl font-bold text-red-600">{summary.alarmsCount}</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Bell className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unbearbeitet</p>
              <p className="text-2xl font-bold text-gray-900">{summary.unacknowledgedNotifications}</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Building className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Abteilungen</p>
              <p className="text-2xl font-bold text-gray-900">{summary.departmentsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Salary Calculator (collapsible) */}
      {showCalculator && (
        <div className="mb-6">
          <SalaryCalculator basisWochenstunden={basisWochenstunden} />
        </div>
      )}

      {/* Urgent Alarms */}
      {urgentAlarms.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
            <AlertTriangle />
            Dringende Stufenaufstiege ({urgentAlarms.length})
          </h2>
          <div className="space-y-4">
            {urgentAlarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onAcknowledge={handleAcknowledge}
                onGeneratePdf={handleGeneratePdf}
                isEditor={isEditor}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Alarms */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp />
          Bevorstehende Stufenaufstiege ({alarms.length})
          {summary && (
            <span className="text-sm font-normal text-gray-500">
              (Schwellenwert: {summary.schwellenwertTage} Tage)
            </span>
          )}
        </h2>

        {alarms.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p>Keine bevorstehenden Stufenaufstiege</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onAcknowledge={handleAcknowledge}
                onGeneratePdf={handleGeneratePdf}
                isEditor={isEditor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
