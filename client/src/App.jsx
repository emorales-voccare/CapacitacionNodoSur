import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Coordinadores from './pages/Coordinadores'
import Tareas from './pages/Tareas'
import Documentacion from './pages/Documentacion'

const PAGES = { dashboard: Dashboard, coordinadores: Coordinadores, tareas: Tareas, documentacion: Documentacion }

function MeshBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-8%',
        width: 640, height: 640, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,103,65,0.14) 0%, transparent 68%)',
        filter: 'blur(70px)',
        animation: 'drift1 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '-12%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 68%)',
        filter: 'blur(80px)',
        animation: 'drift2 26s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-12%', left: '35%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(74,103,65,0.1) 0%, transparent 68%)',
        filter: 'blur(80px)',
        animation: 'drift3 18s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(100,116,139,0.1) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />
      <style>{`
        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,-30px) scale(1.05)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,22px) scale(0.96)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(18px,36px) scale(1.04)} }
      `}</style>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('tareas')
  const [coordOpen, setCoordOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const Page = PAGES[page] || Tareas

  function goTo(p) {
    setPage(p)
    if (p === 'coordinadores' || p === 'dashboard') setCoordOpen(true)
    setSidebarOpen(false)
  }

  const coordActive = page === 'coordinadores' || page === 'dashboard'

  function NavCard({ onClick, active, icon, label, sub, chevron, children }) {
    return (
      <div>
        <button
          onClick={onClick}
          className={`w-full text-left rounded-xl px-3 py-3 transition-all duration-150 ${
            active ? 'bg-brand-600 shadow-md' : 'hover:bg-brand-800/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              active ? 'bg-white/15 text-white' : 'bg-brand-800 text-brand-400'
            }`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">{label}</div>
              <div className={`text-[10px] leading-tight mt-0.5 ${active ? 'text-white/60' : 'text-brand-500'}`}>{sub}</div>
            </div>
            {chevron && (
              <span className={`text-[10px] transition-transform duration-200 ${active ? 'text-white/60' : 'text-brand-600'} ${coordOpen ? 'rotate-180' : ''}`}>▼</span>
            )}
          </div>
        </button>
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f8]" style={{ position: 'relative' }}>
      <MeshBackground />

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
          style={{ zIndex: 20 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar flotante */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col shadow-2xl transition-transform duration-250 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '16rem', background: 'linear-gradient(180deg, #1c2711 0%, #1a2610 100%)' }}
      >
        {/* Brand header */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #4a6741, #3d5636)' }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm5.99 7.176A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#c9a84c' }}>Nodo Sur</div>
                <div className="text-xs font-bold text-white leading-tight">Capacitación</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-brand-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-brand-800"
              title="Cerrar menú"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-brand-700 to-transparent" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-3 space-y-1.5 overflow-y-auto">
          <NavCard
            onClick={() => goTo('tareas')}
            active={page === 'tareas'}
            label="Tareas"
            sub="Gestión de pendientes"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            }
          />

          <NavCard
            onClick={() => setCoordOpen(o => !o)}
            active={coordActive}
            label="Coordinadores"
            sub="Lista · Dashboard"
            chevron
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            }
          >
            {coordOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-brand-800 space-y-0.5">
                <button
                  onClick={() => goTo('coordinadores')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    page === 'coordinadores' ? 'bg-brand-700 text-white' : 'text-brand-400 hover:text-white hover:bg-brand-800/60'
                  }`}
                >
                  Lista de coordinadores
                </button>
                <button
                  onClick={() => goTo('dashboard')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    page === 'dashboard' ? 'bg-brand-700 text-white' : 'text-brand-400 hover:text-white hover:bg-brand-800/60'
                  }`}
                >
                  Dashboard
                </button>
              </div>
            )}
          </NavCard>
        </nav>

        {/* Documentación + footer */}
        <div className="px-3 pb-4 space-y-1.5 shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-brand-800 to-transparent mb-1.5" />
          <NavCard
            onClick={() => goTo('documentacion')}
            active={page === 'documentacion'}
            label="Documentación"
            sub="Links y recursos"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
              </svg>
            }
          />
          <div className="px-3 pt-1 flex items-center justify-between">
            <span className="text-[10px] text-brand-700 uppercase tracking-widest">v1.0 · Fase 1</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" title="Servidor activo" />
          </div>
        </div>
      </aside>

      {/* Content — siempre full width */}
      <main className="flex-1 overflow-auto" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top bar con botón hamburguesa */}
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(0,0,0,0.07)',
            boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
          }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="transition-colors p-1.5 rounded-lg"
            style={{ color: '#4a6741', background: 'rgba(74,103,65,0.08)' }}
            title="Abrir menú"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              background: 'linear-gradient(135deg, #4a6741, #c9a84c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
            }}>N</div>
            <span className="font-bold text-sm tracking-tight" style={{ color: '#1c2711' }}>Nodo Sur</span>
            <span className="text-stone-300 text-sm">·</span>
            <span className="text-sm capitalize" style={{ color: '#64748b' }}>{page}</span>
          </div>
        </div>

        <Page />
      </main>
    </div>
  )
}
