import { useState, useEffect } from 'react'
import { useApi, formatDate } from '../hooks/useApi'
import { useAuth } from '../hooks/useAuth'
import EmployeeTable from '../components/EmployeeTable'
import ExcelImport from '../components/ExcelImport'
import { 
  Users, 
  Plus, 
  X, 
  Save,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react'

const ENTGELTGRUPPEN = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14']

export default function EmployeeEditor() {
  const { get, post, put, del, download, loading, error: apiError } = useApi()
  const { isEditor, isAdmin } = useAuth()
  
  const [employees, setEmployees] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [alarmThreshold, setAlarmThreshold] = useState(40)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)

  const [formData, setFormData] = useState({
    personalnummer: '',
    name: '',
    qualifikation: '',
    abteilung: '',
    eintrittsdatum: '',
    entgeltgruppe: 'E5',
    stufe: 1,
    wochenstunden: 40,
    stundenlohn: 15,
    zulagen: {
      gruppe: 0,
      schicht: 0,
      tl100: false,
      tl150: false
    }
  })

  useEffect(() => {
    loadEmployees()
    loadAlarmThreshold()
  }, [showInactive])

  const loadAlarmThreshold = async () => {
    try {
      const data = await get('/api/dashboard/summary')
      if (data.summary?.schwellenwertTage) {
        setAlarmThreshold(data.summary.schwellenwertTage)
      }
    } catch (err) {
      // Use default threshold if summary fails
    }
  }

  const loadEmployees = async () => {
    try {
      const url = showInactive 
        ? '/api/employees?includeInactive=true' 
        : '/api/employees'
      const data = await get(url)
      setEmployees(data.employees || [])
    } catch (err) {
      console.error('Failed to load employees:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      personalnummer: '',
      name: '',
      qualifikation: '',
      abteilung: '',
      eintrittsdatum: '',
      entgeltgruppe: 'E5',
      stufe: 1,
      wochenstunden: 40,
      stundenlohn: 15,
      zulagen: {
        gruppe: 0,
        schicht: 0,
        tl100: false,
        tl150: false
      }
    })
    setEditingEmployee(null)
    setFormError('')
  }

  const handleEdit = (employee) => {
    let zulagen = { gruppe: 0, schicht: 0, tl100: false, tl150: false }
    try {
      zulagen = typeof employee.zulagen === 'string' 
        ? JSON.parse(employee.zulagen) 
        : employee.zulagen || zulagen
    } catch (e) {}

    setFormData({
      personalnummer: employee.personalnummer,
      name: employee.name,
      qualifikation: employee.qualifikation || '',
      abteilung: employee.abteilung || '',
      eintrittsdatum: employee.eintrittsdatum?.split('T')[0] || '',
      entgeltgruppe: employee.entgeltgruppe,
      stufe: employee.stufe,
      wochenstunden: employee.wochenstunden,
      stundenlohn: employee.stundenlohn,
      zulagen
    })
    setEditingEmployee(employee)
    setShowForm(true)
    setFormError('')
  }

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!employeeToDelete) return

    try {
      // Use hard delete with ?hardDelete=true query parameter
      await del(`/api/employees/${employeeToDelete.id}?hardDelete=true`)
      setSuccessMessage('Mitarbeiter endgültig gelöscht')
      setTimeout(() => setSuccessMessage(''), 3000)
      loadEmployees()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setShowDeleteConfirm(false)
      setEmployeeToDelete(null)
    }
  }

  const handleGeneratePdf = async (employeeId) => {
    try {
      await download(`/api/pdf/stufenaufstieg/${employeeId}`, `Stufenaufstieg_${employeeId}.pdf`)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    try {
      const data = {
        ...formData,
        stufe: parseInt(formData.stufe),
        wochenstunden: parseFloat(formData.wochenstunden),
        stundenlohn: parseFloat(formData.stundenlohn),
        zulagen: formData.zulagen
      }

      if (editingEmployee) {
        await put(`/api/employees/${editingEmployee.id}`, data)
        setSuccessMessage('Mitarbeiter aktualisiert')
      } else {
        await post('/api/employees', data)
        setSuccessMessage('Mitarbeiter erstellt')
      }

      resetForm()
      setShowForm(false)
      loadEmployees()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleImportComplete = () => {
    loadEmployees()
    setShowImport(false)
    setSuccessMessage('Import abgeschlossen')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitarbeiterverwaltung</h1>
          <p className="text-gray-600">
            {employees.length} Mitarbeiter 
            {showInactive ? ' (inkl. Inaktive)' : ' (nur Aktive)'}
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Inaktive anzeigen
          </label>
          
          {isEditor && (
            <>
              <button
                onClick={() => setShowImport(!showImport)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Import/Export
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                Neu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success flex items-center gap-2 mb-4">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {/* Import Section */}
      {showImport && isEditor && (
        <div className="mb-6">
          <ExcelImport onImportComplete={handleImportComplete} />
        </div>
      )}

      {/* Employee Form Modal */}
      {showForm && isEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {formError && (
                <div className="alert alert-error flex items-center gap-2 mb-4">
                  <AlertCircle size={18} />
                  {formError}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Personalnummer *</label>
                  <input
                    type="text"
                    value={formData.personalnummer}
                    onChange={(e) => setFormData({...formData, personalnummer: e.target.value})}
                    className="input"
                    required
                    disabled={!!editingEmployee}
                  />
                </div>

                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Qualifikation</label>
                  <input
                    type="text"
                    value={formData.qualifikation}
                    onChange={(e) => setFormData({...formData, qualifikation: e.target.value})}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Abteilung</label>
                  <input
                    type="text"
                    value={formData.abteilung}
                    onChange={(e) => setFormData({...formData, abteilung: e.target.value})}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Eintrittsdatum *</label>
                  <input
                    type="date"
                    value={formData.eintrittsdatum}
                    onChange={(e) => setFormData({...formData, eintrittsdatum: e.target.value})}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Entgeltgruppe *</label>
                  <select
                    value={formData.entgeltgruppe}
                    onChange={(e) => setFormData({...formData, entgeltgruppe: e.target.value})}
                    className="input"
                    required
                  >
                    {ENTGELTGRUPPEN.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Stufe (1-6) *</label>
                  <select
                    value={formData.stufe}
                    onChange={(e) => setFormData({...formData, stufe: parseInt(e.target.value)})}
                    className="input"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Wochenstunden *</label>
                  <input
                    type="number"
                    value={formData.wochenstunden}
                    onChange={(e) => setFormData({...formData, wochenstunden: parseFloat(e.target.value)})}
                    className="input"
                    step="0.5"
                    min="0"
                    max="48"
                    required
                  />
                </div>

                <div>
                  <label className="label">Stundenlohn (€) *</label>
                  <input
                    type="number"
                    value={formData.stundenlohn}
                    onChange={(e) => setFormData({...formData, stundenlohn: parseFloat(e.target.value)})}
                    className="input"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Zulagen */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-4">Zulagen</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Gruppen-Zulage (€ bei Vollzeit)</label>
                    <input
                      type="number"
                      value={formData.zulagen.gruppe}
                      onChange={(e) => setFormData({
                        ...formData, 
                        zulagen: {...formData.zulagen, gruppe: parseFloat(e.target.value) || 0}
                      })}
                      className="input"
                      step="10"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="label">Schicht-Zulage (€ bei Vollzeit)</label>
                    <input
                      type="number"
                      value={formData.zulagen.schicht}
                      onChange={(e) => setFormData({
                        ...formData, 
                        zulagen: {...formData.zulagen, schicht: parseFloat(e.target.value) || 0}
                      })}
                      className="input"
                      step="10"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.zulagen.tl100}
                        onChange={(e) => setFormData({
                          ...formData, 
                          zulagen: {
                            ...formData.zulagen, 
                            tl100: e.target.checked,
                            tl150: e.target.checked ? false : formData.zulagen.tl150
                          }
                        })}
                        className="w-4 h-4 rounded"
                      />
                      <span>TL +100€</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.zulagen.tl150}
                        onChange={(e) => setFormData({
                          ...formData, 
                          zulagen: {
                            ...formData.zulagen, 
                            tl150: e.target.checked,
                            tl100: e.target.checked ? false : formData.zulagen.tl100
                          }
                        })}
                        className="w-4 h-4 rounded"
                      />
                      <span>TL +150€</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                  disabled={loading}
                >
                  <Save size={18} />
                  {loading ? 'Speichere...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter löschen</h3>
                  <p className="text-sm text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden!</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Name:</strong> {employeeToDelete.name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Personalnummer:</strong> {employeeToDelete.personalnummer}
                </p>
                {employeeToDelete.abteilung && (
                  <p className="text-sm text-gray-600">
                    <strong>Abteilung:</strong> {employeeToDelete.abteilung}
                  </p>
                )}
              </div>

              <p className="text-sm text-red-600 mb-6">
                ⚠️ Der Mitarbeiter und alle zugehörigen Daten (Benachrichtigungen, etc.) werden endgültig gelöscht.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setEmployeeToDelete(null)
                  }}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn btn-danger flex items-center gap-2"
                  disabled={loading}
                >
                  <Trash2 size={18} />
                  {loading ? 'Lösche...' : 'Endgültig löschen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Table */}
      <EmployeeTable
        employees={employees}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onGeneratePdf={handleGeneratePdf}
        isEditor={isEditor}
        isAdmin={isAdmin}
        alarmThreshold={alarmThreshold}
      />
    </div>
  )
}
