import { useState, useEffect } from 'react'

const ICONOS_FOLDER = ['📁', '📂', '📋', '🗂️', '⭐', '🎯']
const ICONOS_ITEM   = ['🔗', '📄', '📊', '📁', '📝', '🖼️', '🎬', '📌']

function detectIcon(url) {
  if (!url) return '🔗'
  if (url.includes('spreadsheets'))  return '📊'
  if (url.includes('/document'))     return '📄'
  if (url.includes('drive/folders') || url.includes('drive/u')) return '📁'
  if (url.includes('presentation'))  return '📊'
  return '🔗'
}

function FolderModal({ onClose, onSave }) {
  const [nombre, setNombre] = useState('')
  const [icono, setIcono]   = useState('📁')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!nombre.trim()) return
    setSaving(true)
    await onSave(nombre.trim(), icono)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Nueva carpeta</h3>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Ícono</label>
          <div className="flex gap-2 flex-wrap">
            {ICONOS_FOLDER.map(i => (
              <button
                key={i}
                onClick={() => setIcono(i)}
                className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${
                  icono === i ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >{i}</button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ej: Plantillas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemModal({ onClose, onSave }) {
  const [nombre, setNombre] = useState('')
  const [url, setUrl]       = useState('')
  const [tipo, setTipo]     = useState('🔗')
  const [saving, setSaving] = useState(false)

  function handleUrlChange(val) {
    setUrl(val)
    setTipo(detectIcon(val))
  }

  async function handleSave() {
    if (!nombre.trim() || !url.trim()) return
    setSaving(true)
    await onSave(nombre.trim(), url.trim(), tipo)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Agregar link</h3>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Ícono</label>
          <div className="flex gap-2 flex-wrap">
            {ICONOS_ITEM.map(i => (
              <button
                key={i}
                onClick={() => setTipo(i)}
                className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${
                  tipo === i ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >{i}</button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input
            autoFocus
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Plantilla de actas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
          <input
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="https://docs.google.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !nombre.trim() || !url.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Documentacion() {
  const [folders, setFolders]               = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [items, setItems]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [showItemModal, setShowItemModal]   = useState(false)
  const [deleteConfirm, setDeleteConfirm]   = useState(null) // { type: 'folder'|'item', id, nombre }

  // Cargar carpetas
  useEffect(() => {
    fetch('/api/documentacion/folders')
      .then(r => r.json())
      .then(data => { setFolders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Cargar items cuando se selecciona carpeta
  useEffect(() => {
    if (!selectedFolder) { setItems([]); return }
    fetch(`/api/documentacion/folders/${selectedFolder.id}/items`)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
  }, [selectedFolder])

  async function createFolder(nombre, icono) {
    const res = await fetch('/api/documentacion/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, icono }),
    })
    const data = await res.json()
    if (res.ok) setFolders(prev => [...prev, data])
  }

  async function deleteFolder(id) {
    await fetch(`/api/documentacion/folders/${id}`, { method: 'DELETE' })
    setFolders(prev => prev.filter(f => f.id !== id))
    if (selectedFolder?.id === id) setSelectedFolder(null)
    setDeleteConfirm(null)
  }

  async function createItem(nombre, url, tipo) {
    const res = await fetch(`/api/documentacion/folders/${selectedFolder.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, url, tipo }),
    })
    const data = await res.json()
    if (res.ok) setItems(prev => [...prev, data])
  }

  async function deleteItem(id) {
    await fetch(`/api/documentacion/items/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {selectedFolder ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => setSelectedFolder(null)} className="hover:text-indigo-600 transition-colors">
                Documentación
              </button>
              <span>›</span>
              <span className="font-semibold text-gray-800">{selectedFolder.icono} {selectedFolder.nombre}</span>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-gray-900">Documentación</h2>
          )}
        </div>
        {selectedFolder ? (
          <button
            onClick={() => setShowItemModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <span>+</span> Agregar link
          </button>
        ) : (
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <span>+</span> Nueva carpeta
          </button>
        )}
      </div>

      {/* Vista carpetas */}
      {!selectedFolder && (
        loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📂</div>
            <p className="font-medium text-sm">No hay carpetas todavía</p>
            <p className="text-xs mt-1">Creá una con el botón de arriba</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {folders.map(folder => (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => setSelectedFolder(folder)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="text-3xl mb-2">{folder.icono}</div>
                  <div className="text-sm font-semibold text-gray-800 leading-tight">{folder.nombre}</div>
                </button>
                <button
                  onClick={() => setDeleteConfirm({ type: 'folder', id: folder.id, nombre: folder.nombre })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg leading-none"
                >×</button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Vista items dentro de carpeta */}
      {selectedFolder && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-sm font-medium">No hay links en esta carpeta</p>
              <p className="text-xs mt-1">Agregá uno con el botón de arriba</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                  <span className="text-xl shrink-0">{item.tipo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{item.url}</p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    Abrir →
                  </a>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'item', id: item.id, nombre: item.nombre })}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg leading-none"
                  >×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modals */}
      {showFolderModal && (
        <FolderModal onClose={() => setShowFolderModal(false)} onSave={createFolder} />
      )}
      {showItemModal && (
        <ItemModal onClose={() => setShowItemModal(false)} onSave={createItem} />
      )}

      {/* Confirmar eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Eliminar</h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <strong>{deleteConfirm.nombre}</strong>?
              {deleteConfirm.type === 'folder' && ' Se borrarán también todos los links que contiene.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
              <button
                onClick={() => deleteConfirm.type === 'folder' ? deleteFolder(deleteConfirm.id) : deleteItem(deleteConfirm.id)}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
