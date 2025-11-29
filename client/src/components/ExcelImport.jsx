import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { useApi } from '../hooks/useApi'

export default function ExcelImport({ onImportComplete }) {
  const { post, download, loading, error } = useApi()
  const [importResult, setImportResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportResult({ error: 'Bitte wählen Sie eine Excel-Datei (.xlsx oder .xls)' })
      return
    }

    try {
      // Read file as base64
      const base64 = await fileToBase64(file)
      
      // Send to server
      const result = await post('/api/admin/import/employees', { 
        data: base64 
      })

      setImportResult(result)
      
      if (onImportComplete) {
        onImportComplete(result)
      }
    } catch (err) {
      setImportResult({ error: err.message })
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        // Remove data URL prefix
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const handleDownloadTemplate = async () => {
    try {
      await download('/api/admin/import/template', 'Mitarbeiter_Import_Vorlage.xlsx')
    } catch (err) {
      console.error('Template download failed:', err)
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FileSpreadsheet className="text-primary-600" />
        Excel Import/Export
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Import */}
        <div>
          <h3 className="font-medium text-gray-700 mb-3">Mitarbeiter importieren</h3>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto mb-3 text-gray-400" size={40} />
            <p className="text-gray-600 mb-2">
              Excel-Datei hierher ziehen
            </p>
            <p className="text-sm text-gray-400 mb-4">oder</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Importiere...' : 'Datei auswählen'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="mt-4 text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            <Download size={14} />
            Import-Vorlage herunterladen
          </button>
        </div>

        {/* Export */}
        <div>
          <h3 className="font-medium text-gray-700 mb-3">Mitarbeiter exportieren</h3>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-600 mb-4">
              Exportieren Sie alle Mitarbeiterdaten als Excel-Datei.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => download('/api/admin/export/employees', `Mitarbeiter_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Download size={18} />
                Aktive Mitarbeiter exportieren
              </button>

              <button
                onClick={() => download('/api/admin/export/employees?includeInactive=true', `Alle_Mitarbeiter_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Download size={18} />
                Alle inkl. Inaktive exportieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`mt-4 p-4 rounded-lg ${
          importResult.error 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          {importResult.error ? (
            <div className="flex items-start gap-2 text-red-700">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Import fehlgeschlagen</p>
                <p className="text-sm">{importResult.error}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-green-700">
              <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Import erfolgreich!</p>
                <p className="text-sm">
                  {importResult.imported} neu importiert, {importResult.updated} aktualisiert
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="font-medium">Warnungen:</p>
                    <ul className="list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... und {importResult.errors.length - 5} weitere</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
