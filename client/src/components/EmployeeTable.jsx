import { useState, useMemo } from 'react'
import { formatDate, formatCurrency } from '../hooks/useApi'
import { 
  Edit, 
  Trash2, 
  FileText, 
  ChevronUp, 
  ChevronDown,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function EmployeeTable({ 
  employees, 
  onEdit, 
  onDelete, 
  onGeneratePdf,
  isEditor,
  isAdmin,
  alarmThreshold = 40 // Default threshold, can be passed from parent
}) {
  const [sortField, setSortField] = useState('personalnummer')
  const [sortDirection, setSortDirection] = useState('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAbteilung, setFilterAbteilung] = useState('')

  // Get unique departments
  const abteilungen = useMemo(() => {
    const depts = new Set(employees.map(e => e.abteilung).filter(Boolean))
    return Array.from(depts).sort()
  }, [employees])

  // Sort and filter employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e => 
        e.name?.toLowerCase().includes(term) ||
        e.personalnummer?.toLowerCase().includes(term) ||
        e.qualifikation?.toLowerCase().includes(term)
      )
    }

    // Department filter
    if (filterAbteilung) {
      result = result.filter(e => e.abteilung === filterAbteilung)
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      // Handle nested gehalt field
      if (sortField === 'gesamtBrutto') {
        aVal = a.gehalt?.gesamtBrutto || 0
        bVal = b.gehalt?.gesamtBrutto || 0
      }

      // Handle dates
      if (sortField === 'naechsterAufstieg' || sortField === 'eintrittsdatum') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [employees, searchTerm, filterAbteilung, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const getAlarmBadge = (employee) => {
    if (!employee.naechsterAufstieg) return null
    
    const heute = new Date()
    const aufstieg = new Date(employee.naechsterAufstieg)
    const diffDays = Math.ceil((aufstieg - heute) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="badge badge-red flex items-center gap-1"><AlertTriangle size={12} />Überfällig</span>
    }
    // Use configurable threshold from backend settings
    if (diffDays <= alarmThreshold) {
      return <span className="badge badge-red flex items-center gap-1"><AlertTriangle size={12} />{diffDays}T</span>
    }
    if (diffDays <= alarmThreshold * 2) {
      return <span className="badge badge-yellow">{diffDays}T</span>
    }
    return <span className="badge badge-green">{diffDays}T</span>
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, PN, Qualifikation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <div className="min-w-[150px]">
          <select
            value={filterAbteilung}
            onChange={(e) => setFilterAbteilung(e.target.value)}
            className="input"
          >
            <option value="">Alle Abteilungen</option>
            {abteilungen.map(abt => (
              <option key={abt} value={abt}>{abt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('personalnummer')}
              >
                <div className="flex items-center gap-1">
                  PN <SortIcon field="personalnummer" />
                </div>
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name <SortIcon field="name" />
                </div>
              </th>
              <th>Qualifikation</th>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('abteilung')}
              >
                <div className="flex items-center gap-1">
                  Abteilung <SortIcon field="abteilung" />
                </div>
              </th>
              <th>Entgelt</th>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stufe')}
              >
                <div className="flex items-center gap-1">
                  Stufe <SortIcon field="stufe" />
                </div>
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('naechsterAufstieg')}
              >
                <div className="flex items-center gap-1">
                  Aufstieg <SortIcon field="naechsterAufstieg" />
                </div>
              </th>
              <th 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('gesamtBrutto')}
              >
                <div className="flex items-center gap-1">
                  Brutto <SortIcon field="gesamtBrutto" />
                </div>
              </th>
              <th>Status</th>
              {isEditor && <th>Aktionen</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee.id}>
                <td className="font-mono text-gray-900">{employee.personalnummer}</td>
                <td className="font-medium text-gray-900">{employee.name}</td>
                <td className="text-gray-600">{employee.qualifikation || '-'}</td>
                <td className="text-gray-600">{employee.abteilung || '-'}</td>
                <td>{employee.entgeltgruppe}</td>
                <td>
                  <span className="badge badge-blue">{employee.stufe}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{formatDate(employee.naechsterAufstieg)}</span>
                    {getAlarmBadge(employee)}
                  </div>
                </td>
                <td className="font-medium text-gray-900">
                  {formatCurrency(employee.gehalt?.gesamtBrutto)}
                </td>
                <td>
                  {employee.aktiv ? (
                    <span className="badge badge-green flex items-center gap-1">
                      <CheckCircle size={12} />
                      Aktiv
                    </span>
                  ) : (
                    <span className="badge badge-red flex items-center gap-1">
                      <XCircle size={12} />
                      Inaktiv
                    </span>
                  )}
                </td>
                {isEditor && (
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(employee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Bearbeiten"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onGeneratePdf(employee.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="PDF erstellen"
                      >
                        <FileText size={16} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(employee)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Keine Mitarbeiter gefunden
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {filteredEmployees.length} von {employees.length} Mitarbeitern
      </div>
    </div>
  )
}
