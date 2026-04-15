import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Coordinadores from './pages/Coordinadores'
import Tareas from './pages/Tareas'

const NAV = [
  { key: 'dashboard',      label: 'Dashboard',      icon: '📊' },
  { key: 'coordinadores',  label: 'Coordinadores',  icon: '👥' },
  { key: 'tareas',         label: 'Tareas',          icon: '✓'  },
]

const PAGES = { dashboard: Dashboard, coordinadores: Coordinadores, tareas: Tareas }

export default function App() {
  const [page, setPage] = useState('dashboard')

  const Page = PAGES[page] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-gray-700">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">Nodo Sur</div>
          <h1 className="text-lg font-bold text-white leading-tight">Gestión de Capacitación</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                page === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
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
