import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Coordinadores from './pages/Coordinadores'
import Tareas from './pages/Tareas'

const PAGES = { dashboard: Dashboard, coordinadores: Coordinadores, tareas: Tareas }

export default function App() {
  const [page, setPage] = useState('tareas')
  const [coordOpen, setCoordOpen] = useState(false)

  const Page = PAGES[page] || Tareas

  function goTo(p) {
    setPage(p)
    if (p === 'coordinadores' || p === 'dashboard') setCoordOpen(true)
  }

  const coordActive = page === 'coordinadores' || page === 'dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Nodo Sur</div>
          <h1 className="text-lg font-bold text-white leading-tight">Gestión de Capacitación</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {/* Tareas */}
          <button
            onClick={() => goTo('tareas')}
            className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              page === 'tareas'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>✓</span>
            Tareas
          </button>

          {/* Coordinadores — colapsable */}
          <div>
            <button
              onClick={() => setCoordOpen(o => !o)}
              className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                coordActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span className="flex-1">Coordinadores</span>
              <span className="text-xs opacity-60">{coordOpen ? '▲' : '▼'}</span>
            </button>

            {coordOpen && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                <button
                  onClick={() => goTo('coordinadores')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    page === 'coordinadores'
                      ? 'bg-indigo-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Lista
                </button>
                <button
                  onClick={() => goTo('dashboard')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    page === 'dashboard'
                      ? 'bg-indigo-500 text-white font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
          v1.0 · Fase 1
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Page />
      </main>
    </div>
  )
}
