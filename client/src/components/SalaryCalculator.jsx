import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber } from '../hooks/useApi'
import { Calculator, Euro, Clock, Plus } from 'lucide-react'

const ENTGELTGRUPPEN = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14']

export default function SalaryCalculator({ basisWochenstunden = 40 }) {
  const [wochenstunden, setWochenstunden] = useState(40)
  const [stundenlohn, setStundenlohn] = useState(18)
  const [zulagen, setZulagen] = useState({
    gruppe: 0,
    schicht: 0,
    tl100: false,
    tl150: false
  })

  const [result, setResult] = useState(null)

  useEffect(() => {
    berechneGehalt()
  }, [wochenstunden, stundenlohn, zulagen, basisWochenstunden])

  const berechneGehalt = () => {
    const monatsstunden = wochenstunden * 4.348
    const basisBrutto = monatsstunden * stundenlohn

    // Variable Zulagen (anteilig)
    const gruppeZulage = zulagen.gruppe > 0 
      ? (wochenstunden / basisWochenstunden) * zulagen.gruppe 
      : 0
    const schichtZulage = zulagen.schicht > 0 
      ? (wochenstunden / basisWochenstunden) * zulagen.schicht 
      : 0

    // Fix-Zulagen
    const tl100 = zulagen.tl100 ? 100 : 0
    const tl150 = zulagen.tl150 ? 150 : 0

    const gesamtZulagen = gruppeZulage + schichtZulage + tl100 + tl150
    const gesamtBrutto = basisBrutto + gesamtZulagen

    setResult({
      monatsstunden: Math.round(monatsstunden * 100) / 100,
      basisBrutto: Math.round(basisBrutto * 100) / 100,
      zulagen: {
        gruppeZulage: Math.round(gruppeZulage * 100) / 100,
        schichtZulage: Math.round(schichtZulage * 100) / 100,
        tl100,
        tl150,
        gesamt: Math.round(gesamtZulagen * 100) / 100
      },
      gesamtBrutto: Math.round(gesamtBrutto * 100) / 100
    })
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Calculator className="text-primary-600" />
        Gehaltsrechner
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Eingabe */}
        <div className="space-y-4">
          <div>
            <label className="label">
              Wochenstunden
            </label>
            <div className="relative">
              <input
                type="number"
                value={wochenstunden}
                onChange={(e) => setWochenstunden(parseFloat(e.target.value) || 0)}
                className="input"
                step="0.5"
                min="0"
                max="48"
              />
              <Clock size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="label">
              Stundenlohn (€)
            </label>
            <div className="relative">
              <input
                type="number"
                value={stundenlohn}
                onChange={(e) => setStundenlohn(parseFloat(e.target.value) || 0)}
                className="input"
                step="0.50"
                min="0"
              />
              <Euro size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <hr className="my-4" />

          <h3 className="font-medium text-gray-700">Zulagen</h3>

          <div>
            <label className="label">
              Gruppen-Zulage (Vollzeit-Wert in €)
            </label>
            <input
              type="number"
              value={zulagen.gruppe}
              onChange={(e) => setZulagen({...zulagen, gruppe: parseFloat(e.target.value) || 0})}
              className="input"
              step="10"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Wird anteilig berechnet: ({wochenstunden}/{basisWochenstunden}) × Wert
            </p>
          </div>

          <div>
            <label className="label">
              Schicht-Zulage (Vollzeit-Wert in €)
            </label>
            <input
              type="number"
              value={zulagen.schicht}
              onChange={(e) => setZulagen({...zulagen, schicht: parseFloat(e.target.value) || 0})}
              className="input"
              step="10"
              min="0"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={zulagen.tl100}
                onChange={(e) => setZulagen({...zulagen, tl100: e.target.checked, tl150: e.target.checked ? false : zulagen.tl150})}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span>TL +100€</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={zulagen.tl150}
                onChange={(e) => setZulagen({...zulagen, tl150: e.target.checked, tl100: e.target.checked ? false : zulagen.tl100})}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span>TL +150€</span>
            </label>
          </div>
        </div>

        {/* Ergebnis */}
        {result && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-4">Berechnung</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monatsstunden:</span>
                <span>{formatNumber(result.monatsstunden)} Std.</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Basis-Brutto:</span>
                <span>{formatCurrency(result.basisBrutto)}</span>
              </div>

              <hr />

              <div className="text-gray-500 font-medium">Zulagen:</div>

              <div className="flex justify-between pl-4">
                <span className="text-gray-600">Gruppen-Zulage:</span>
                <span>{formatCurrency(result.zulagen.gruppeZulage)}</span>
              </div>

              <div className="flex justify-between pl-4">
                <span className="text-gray-600">Schicht-Zulage:</span>
                <span>{formatCurrency(result.zulagen.schichtZulage)}</span>
              </div>

              <div className="flex justify-between pl-4">
                <span className="text-gray-600">TL 100€:</span>
                <span>{formatCurrency(result.zulagen.tl100)}</span>
              </div>

              <div className="flex justify-between pl-4">
                <span className="text-gray-600">TL 150€:</span>
                <span>{formatCurrency(result.zulagen.tl150)}</span>
              </div>

              <div className="flex justify-between pl-4 font-medium">
                <span className="text-gray-600">Zulagen Gesamt:</span>
                <span>{formatCurrency(result.zulagen.gesamt)}</span>
              </div>

              <hr />

              <div className="flex justify-between text-lg font-bold bg-primary-100 p-3 rounded-lg">
                <span className="text-primary-700">Gesamt-Brutto:</span>
                <span className="text-primary-700">{formatCurrency(result.gesamtBrutto)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>Hinweis:</strong> Dies ist eine Brutto-Berechnung. 
              Für Netto-Werte sind Steuer- und Sozialabgaben zu berücksichtigen.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
