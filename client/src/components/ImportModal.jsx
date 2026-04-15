import { useState } from 'react'

const COUNTRIES = ['argentina', 'chile', 'ecuador', 'peru', 'bolivia', 'paraguay', 'uruguay']
const FLAGS = { argentina: '🇦🇷', chile: '🇨🇱', ecuador: '🇪🇨', peru: '🇵🇪', bolivia: '🇧🇴', paraguay: '🇵🇾', uruguay: '🇺🇾' }

const BADGE_COLOR = {
  0: 'bg-red-100 text-red-500',
  50: 'bg-yellow-100 text-yellow-700',
  100: 'bg-green-100 text-green-700',
}

export default function ImportModal({ onClose, onImported }) {
  const [url, setUrl] = useState('https://docs.google.com/spreadsheets/d/1j2bEf-WkQi3L7sOWdhsB1VBTk7mfyZpF_wjWd13Wtgk/edit?gid=523955855#gid=523955855')
  const [mode, setMode] = useState('replace')
  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [error, setError] = useState('')

  async function handlePreview() {
    setError('')
    setPreview(null)
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al previsualizar')
      setPreview(data.coordinadores)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleConfirm() {
    setError('')
    setLoadingImport(true)
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinadores: preview, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al importar')
      onImported(data.imported)
    } catch (err) {
      setError(err.message)
      setLoadingImport(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Importar desde Google Sheets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 overflow-auto flex-1 space-y-5">
          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del Google Sheet</label>
            <input
              type="text"
              value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null) }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400 mt-1">La hoja debe ser pública ("Cualquiera con el enlace puede ver")</p>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modo de importación</label>
            <div className="flex gap-3">
              {[
                { value: 'replace', label: 'Reemplazar todo', desc: 'Borra los datos actuales y carga los nuevos' },
                { value: 'merge', label: 'Solo agregar nuevos', desc: 'Mantiene los existentes y agrega los que faltan' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`flex-1 text-left p-3 rounded-xl border-2 text-sm transition-all ${
                    mode === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-800">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">
                  Vista previa — {preview.length} coordinadores encontrados
                </p>
                {mode === 'replace' && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    Reemplazará todos los datos actuales
                  </span>
                )}
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Nombre</th>
                      {COUNTRIES.map(c => (
                        <th key={c} className="px-2 py-2 text-center font-semibold text-gray-600 uppercase text-xs">
                          {FLAGS[c]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{c.nombre}</td>
                        {COUNTRIES.map(key => (
                          <td key={key} className="px-2 py-2 text-center">
                            <span className={`inline-block w-8 rounded-full text-center py-0.5 font-bold ${BADGE_COLOR[c[key] ?? 0]}`}>
                              {c[key] ?? 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loadingPreview || !url.trim()}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loadingPreview ? 'Cargando...' : 'Previsualizar'}
            </button>
            {preview && (
              <button
                onClick={handleConfirm}
                disabled={loadingImport}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loadingImport ? 'Importando...' : `Importar ${preview.length} coordinadores`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
