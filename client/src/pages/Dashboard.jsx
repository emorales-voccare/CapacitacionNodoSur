import { useState, useEffect } from 'react'
import SouthAmericaMap from '../components/SouthAmericaMap'

const COUNTRIES = [
  { key: 'argentina', label: 'Argentina', flag: '🇦🇷', color: '#5DADE2' },
  { key: 'chile',     label: 'Chile',     flag: '🇨🇱', color: '#E57373' },
  { key: 'ecuador',   label: 'Ecuador',   flag: '🇪🇨', color: '#C9A84C' },
  { key: 'peru',      label: 'Perú',      flag: '🇵🇪', color: '#7B1C2E' },
  { key: 'bolivia',   label: 'Bolivia',   flag: '🇧🇴', color: '#2E7D4F' },
  { key: 'paraguay',  label: 'Paraguay',  flag: '🇵🇾', color: '#1A3A5C' },
  { key: 'uruguay',   label: 'Uruguay',   flag: '🇺🇾', color: '#7F9BAD' },
]

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${colors[color]}`}>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div>
        <div className="text-xs font-semibold leading-tight">{label}</div>
        {sub && <div className="text-xs opacity-60 mt-0.5 leading-tight">{sub}</div>}
      </div>
    </div>
  )
}

const BADGE = { 100: '✓', 50: '½', 0: '○' }
const BADGE_COLOR = {
  100: 'bg-green-100 text-green-700',
  50:  'bg-yellow-100 text-yellow-700',
  0:   'bg-red-50 text-red-400',
}

export default function Dashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState(null)

  useEffect(() => {
    fetch('/api/coordinadores')
      .then(r => r.json())
      .then(rows => { setData(Array.isArray(rows) ? rows : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
  }

  const total = data.length

  const completos = data.filter(c => COUNTRIES.every(({ key }) => c[key] === 100)).length
  const enProceso = data.filter(c =>
    COUNTRIES.some(({ key }) => c[key] === 50) && !COUNTRIES.every(({ key }) => c[key] === 100)
  ).length

  const avgByCountry = {}
  const countByCountry = {}
  const countryStats = COUNTRIES.map(({ key, label, flag, color }) => {
    const avg = total > 0
      ? Math.round(data.reduce((acc, c) => acc + (c[key] || 0), 0) / total)
      : 0
    const trained = data.filter(c => c[key] === 100).length
    avgByCountry[key] = avg
    countByCountry[key] = trained
    return { key, label, flag, color, avg, trained }
  }).sort((a, b) => b.avg - a.avg)

  const globalAvg = total > 0
    ? Math.round(countryStats.reduce((acc, c) => acc + c.avg, 0) / COUNTRIES.length)
    : 0

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-400 text-xs">Matriz Radar · Coordinadores Sur 2026</p>
      </div>

      {total === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold">No hay datos aún</p>
          <p className="text-sm mt-1">Andá a <strong>Coordinadores</strong> e importá desde Google Sheets para comenzar.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <StatCard label="Coordinadores" value={total} sub="registrados" color="indigo" />
            <StatCard label="Capacitados completos" value={completos} sub="100% en todos los países" color="green" />
            <StatCard label="En proceso" value={enProceso} sub="al menos un país en 50%" color="yellow" />
            <StatCard label="Promedio general" value={`${globalAvg}%`} sub="todos los países" color="indigo" />
          </div>

          {/* Map + Country bars side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Mapa */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cobertura por país</h3>
              <SouthAmericaMap
                avgByCountry={avgByCountry}
                countByCountry={countByCountry}
                total={total}
                onCountryClick={key => setSelectedCountry(key)}
              />
            </div>

            {/* Barras + distribución */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Promedio por país</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {countryStats.map(({ key, label, flag, color, avg, trained }) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-1.5">
                    <span className="text-base w-6">{flag}</span>
                    <div className="w-20 text-xs font-medium text-gray-700">{label}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: color }} />
                    </div>
                    <span className="w-10 text-right text-xs font-bold" style={{ color }}>{avg}%</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{trained}/{total}</span>
                  </div>
                ))}
              </div>

              {/* Tabla por país */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Distribución por país</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="text-left pb-1 font-medium">País</th>
                      <th className="text-center pb-1 font-medium text-green-600">✓ Cap.</th>
                      <th className="text-center pb-1 font-medium text-yellow-600">½ Proc.</th>
                      <th className="text-center pb-1 font-medium text-red-400">○ S/I</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {countryStats.map(({ key, label, flag }) => {
                      const cap  = data.filter(c => c[key] === 100).length
                      const proc = data.filter(c => c[key] === 50).length
                      const si   = data.filter(c => !c[key] || c[key] === 0).length
                      return (
                        <tr key={key} className="hover:bg-white cursor-pointer" onClick={() => setSelectedCountry(key)}>
                          <td className="py-1 flex items-center gap-1.5">
                            <span>{flag}</span>
                            <span className="font-medium text-gray-700">{label}</span>
                          </td>
                          <td className="text-center py-1 font-bold text-green-600">{cap}</td>
                          <td className="text-center py-1 font-bold text-yellow-600">{proc}</td>
                          <td className="text-center py-1 font-bold text-red-400">{si}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

      {/* Panel de coordinadores por país */}
      {selectedCountry !== null && (() => {
        const country = COUNTRIES.find(c => c.key === selectedCountry)
        const coords = data
          .filter(c => c[selectedCountry] === 100)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">
                  {country.flag} {country.label}
                </h3>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >×</button>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 px-5">
                {coords.length === 0 ? (
                  <p className="py-6 text-center text-gray-400 text-sm">Sin coordinadores</p>
                ) : coords.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-800 font-medium">{c.nombre}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
