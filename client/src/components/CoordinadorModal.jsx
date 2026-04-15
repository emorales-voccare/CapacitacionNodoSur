import { useState, useEffect } from 'react'

const COUNTRIES = [
  { key: 'argentina', label: 'Argentina', flag: '🇦🇷' },
  { key: 'chile', label: 'Chile', flag: '🇨🇱' },
  { key: 'ecuador', label: 'Ecuador', flag: '🇪🇨' },
  { key: 'peru', label: 'Perú', flag: '🇵🇪' },
  { key: 'bolivia', label: 'Bolivia', flag: '🇧🇴' },
  { key: 'paraguay', label: 'Paraguay', flag: '🇵🇾' },
  { key: 'uruguay', label: 'Uruguay', flag: '🇺🇾' },
]

const EMPTY = {
  nombre: '',
  argentina: 0, chile: 0, ecuador: 0, peru: 0, bolivia: 0, paraguay: 0, uruguay: 0,
}

const LEVEL_LABELS = { 0: 'Sin capacitar', 50: 'En proceso', 100: 'Capacitado' }
const LEVEL_COLORS = {
  0: 'border-red-300 bg-red-50 text-red-700',
  50: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  100: 'border-green-300 bg-green-50 text-green-700',
}

export default function CoordinadorModal({ coordinador, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!coordinador?.id

  useEffect(() => {
    setForm(coordinador ? { ...EMPTY, ...coordinador } : EMPTY)
    setError('')
  }, [coordinador])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const url = isEdit ? `/api/coordinadores/${coordinador.id}` : '/api/coordinadores'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSave(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar coordinador' : 'Agregar coordinador'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: GARCIA MARIO"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
              autoFocus
            />
          </div>

          {/* Countries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Nivel de capacitación por país</label>
            <div className="space-y-2">
              {COUNTRIES.map(({ key, label, flag }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-700 flex items-center gap-2">
                    <span>{flag}</span>{label}
                  </span>
                  <div className="flex gap-2">
                    {[0, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, [key]: val }))}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          form[key] === val
                            ? LEVEL_COLORS[val] + ' ring-2 ring-offset-1 ' + (val === 0 ? 'ring-red-300' : val === 50 ? 'ring-yellow-300' : 'ring-green-300')
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {val === 0 ? '0' : val === 50 ? '50' : '100'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{LEVEL_LABELS[form[key]]}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
