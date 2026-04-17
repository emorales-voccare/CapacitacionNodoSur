import { useState, useEffect, useRef } from 'react'
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps'

const GEO_URL = '/countries-110m.json'

const SOUTH_AMERICA = new Set([
  '032', // Argentina
  '068', // Bolivia
  '076', // Brasil
  '152', // Chile
  '170', // Colombia
  '218', // Ecuador
  '328', // Guyana
  '600', // Paraguay
  '604', // Perú
  '740', // Suriname
  '858', // Uruguay
  '862', // Venezuela
  '254', // Guayana Francesa
])

const ISO_TO_KEY = {
  '032': 'argentina',
  '068': 'bolivia',
  '152': 'chile',
  '218': 'ecuador',
  '600': 'paraguay',
  '604': 'peru',
  '858': 'uruguay',
}

const COUNTRY_COLORS = {
  argentina: '#5DADE2',
  chile:     '#E57373',
  ecuador:   '#C9A84C',
  peru:      '#7B1C2E',
  bolivia:   '#2E7D4F',
  paraguay:  '#1A3A5C',
  uruguay:   '#7F9BAD',
}

const COUNTRY_NAMES = {
  '032': 'Argentina', '068': 'Bolivia',  '076': 'Brasil',
  '152': 'Chile',     '170': 'Colombia', '218': 'Ecuador',
  '328': 'Guyana',    '600': 'Paraguay', '604': 'Perú',
  '740': 'Suriname',  '858': 'Uruguay',  '862': 'Venezuela',
  '254': 'Guayana Francesa',
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 50)
  const g = Math.min(255, ((n >> 8)  & 0xff) + 50)
  const b = Math.min(255, ( n        & 0xff) + 50)
  return `rgb(${r},${g},${b})`
}

// Rotación inicial centrada en Sudamérica
const INITIAL_ROTATION = [62, 14, 0]

export default function SouthAmericaMap({ avgByCountry = {}, countByCountry = {}, total = 0, onCountryClick }) {
  const [tooltip, setTooltip]     = useState(null)
  const [rotation, setRotation]   = useState(INITIAL_ROTATION)
  const [dragging, setDragging]   = useState(false)
  const lastPos    = useRef(null)
  const autoActive = useRef(true)   // auto-rotación activa hasta primer drag

  // Auto-rotación suave
  useEffect(() => {
    const interval = setInterval(() => {
      if (autoActive.current) {
        setRotation(prev => [prev[0] - 0.2, prev[1], 0])
      }
    }, 40)
    return () => clearInterval(interval)
  }, [])

  function onMouseDown(e) {
    autoActive.current = false
    setDragging(true)
    lastPos.current = [e.clientX, e.clientY]
    e.preventDefault()
  }

  function onMouseMove(e) {
    if (!dragging || !lastPos.current) return
    const dx = e.clientX - lastPos.current[0]
    const dy = e.clientY - lastPos.current[1]
    setRotation(prev => [
      prev[0] + dx * 0.4,
      Math.max(-80, Math.min(80, prev[1] - dy * 0.4)),
      0,
    ])
    lastPos.current = [e.clientX, e.clientY]
  }

  function onMouseUp() {
    setDragging(false)
    lastPos.current = null
  }

  function handleReset() {
    setRotation(INITIAL_ROTATION)
    autoActive.current = true
  }

  return (
    <div className="relative">
      {/* Controles */}
      <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
        <button
          onClick={handleReset}
          title="Volver a Sudamérica"
          className="w-6 h-6 bg-white/80 border border-gray-200 rounded text-xs text-gray-500 hover:bg-white hover:text-indigo-600 transition-colors shadow-sm flex items-center justify-center"
        >⌖</button>
      </div>

      <div
        className="select-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{ rotate: rotation, scale: 220 }}
          width={400}
          height={400}
          style={{ width: '100%', height: 'auto' }}
        >
          {/* Océano */}
          <Sphere fill="#c8e6f7" stroke="#a8d4ee" strokeWidth={0.5} />

          {/* Grilla */}
          <Graticule stroke="#b3d4e8" strokeWidth={0.25} step={[20, 20]} />

          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const isSA      = SOUTH_AMERICA.has(geo.id)
                const key       = ISO_TO_KEY[geo.id]
                const isTracked = isSA && key !== undefined
                const baseColor = isSA ? (COUNTRY_COLORS[key] || '#9ca3af') : '#dde8ee'
                const name      = COUNTRY_NAMES[geo.id] || geo.properties?.name

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={baseColor}
                    stroke={isSA ? '#fff' : '#c8d8e2'}
                    strokeWidth={isSA ? 0.7 : 0.2}
                    style={{
                      default:  { outline: 'none', cursor: isTracked ? 'pointer' : dragging ? 'grabbing' : 'grab' },
                      hover:    { outline: 'none', fill: isSA ? lighten(baseColor) : '#c8d4da' },
                      pressed:  { outline: 'none' },
                    }}
                    onMouseEnter={isSA ? (e) => setTooltip({
                      name,
                      isTracked,
                      avg:     key ? (avgByCountry[key] ?? 0) : null,
                      trained: key ? (countByCountry[key] ?? 0) : 0,
                      x: e.clientX,
                      y: e.clientY,
                    }) : undefined}
                    onMouseMove={isSA ? (e) => setTooltip(p => p ? { ...p, x: e.clientX, y: e.clientY } : null) : undefined}
                    onMouseLeave={isSA ? () => setTooltip(null) : undefined}
                    onClick={isTracked ? () => onCountryClick && onCountryClick(key) : undefined}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="font-bold text-sm">{tooltip.name}</div>
          {tooltip.isTracked ? (
            <div className="mt-1 space-y-0.5">
              <div>Capacitados: <span className="font-bold text-green-400">{tooltip.trained} / {total}</span></div>
              <div>Promedio: <span className="font-bold">{tooltip.avg}%</span></div>
            </div>
          ) : (
            <div className="text-gray-400 mt-0.5 text-xs">No rastreado</div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-2 flex flex-wrap gap-1.5 justify-center text-xs text-gray-600">
        {Object.entries(COUNTRY_COLORS).map(([key, color]) => {
          const iso  = Object.entries(ISO_TO_KEY).find(([, k]) => k === key)?.[0]
          const name = iso ? COUNTRY_NAMES[iso] : key
          return (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
              <span>{name}</span>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-1.5">
        Arrastrá para rotar · Hacé click en un país para ver detalles
      </p>
    </div>
  )
}
