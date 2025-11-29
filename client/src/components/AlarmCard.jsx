import { AlertTriangle, Calendar, CheckCircle, FileText, Euro } from 'lucide-react'
import { formatDate, formatCurrency } from '../hooks/useApi'

export default function AlarmCard({ alarm, onAcknowledge, onGeneratePdf, isEditor }) {
  const getLevelColor = (level) => {
    switch (level) {
      case 'rot':
        return 'border-l-red-500 bg-red-50'
      case 'gelb':
        return 'border-l-yellow-500 bg-yellow-50'
      default:
        return 'border-l-green-500 bg-green-50'
    }
  }

  const getLevelBadge = (level, tage) => {
    if (tage < 0) {
      return <span className="badge badge-red">Überfällig!</span>
    }
    switch (level) {
      case 'rot':
        return <span className="badge badge-red">{tage} Tage</span>
      case 'gelb':
        return <span className="badge badge-yellow">{tage} Tage</span>
      default:
        return <span className="badge badge-green">{tage} Tage</span>
    }
  }

  return (
    <div className={`card border-l-4 ${getLevelColor(alarm.alarmLevel)}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle 
              size={20} 
              className={alarm.alarmLevel === 'rot' ? 'text-red-500' : 'text-yellow-500'} 
            />
            <h3 className="font-semibold text-gray-900">{alarm.name}</h3>
            {getLevelBadge(alarm.alarmLevel, alarm.tageBisAufstieg)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
            <div>
              <span className="text-gray-400">PN:</span> {alarm.personalnummer}
            </div>
            <div>
              <span className="text-gray-400">Abteilung:</span> {alarm.abteilung || '-'}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Stufe:</span> 
              {alarm.aktuelleStufe} → <strong className="text-green-600">{alarm.naechsteStufe}</strong>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" />
              {formatDate(alarm.naechsterAufstieg)}
            </div>
          </div>

          {alarm.gehalt && (
            <div className="flex items-center gap-2 text-sm bg-gray-100 rounded-lg px-3 py-2 inline-block">
              <Euro size={14} className="text-gray-500" />
              <span className="text-gray-600">Brutto:</span>
              <strong>{formatCurrency(alarm.gehalt.gesamtBrutto)}</strong>
            </div>
          )}

          {alarm.istBestaetigt && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle size={16} />
              <span>
                Bearbeitet von {alarm.bestaetigtVon} am {formatDate(alarm.bestaetigtAm)}
              </span>
            </div>
          )}
        </div>

        {isEditor && (
          <div className="flex flex-col gap-2 ml-4">
            {!alarm.istBestaetigt && (
              <button
                onClick={() => onAcknowledge(alarm.id)}
                className="btn btn-success text-sm flex items-center gap-1"
              >
                <CheckCircle size={16} />
                Erledigt
              </button>
            )}
            <button
              onClick={() => onGeneratePdf(alarm.id)}
              className="btn btn-primary text-sm flex items-center gap-1"
            >
              <FileText size={16} />
              Brief
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
