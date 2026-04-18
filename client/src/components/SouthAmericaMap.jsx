import { useState } from 'react'
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from 'react-simple-maps'

const GEO_URL = '/countries-110m.json'

const SOUTH_AMERICA = new Set([
  '032', '068', '076', '152', '170', '218',
  '328', '600', '604', '740', '858', '862', '254',
])

const ISO_TO_KEY = {
  '032': 'argentina', '068': 'bolivia', '152': 'chile',
  '218': 'ecuador',   '600': 'paraguay','604': 'peru', '858': 'uruguay',
}

const COUNTRY_COLORS = {
  argentina: '#5DADE2', chile:    '#E57373', ecuador: '#C9A84C',
  peru:      '#7B1C2E', bolivia:  '#2E7D4F', paraguay:'#1A3A5C', uruguay: '#7F9BAD',
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

export default function SouthAmericaMap({ avgByCountry = {}, countByCountry = {}, total = 0, onCountryClick }) {
  const [tooltip, setTooltip] = useState(null)

  return (
    <div className="relative">
      <ComposableMap
        projection="geoOrthographic"
        projectionConfig={{ rotate: [62, 14, 0], scale: 220 }}
        width={400}
        height={400}
        style={{ width: '100%', height: 'auto' }}
      >
        <Sphere fill="#c8e6f7" stroke="#a8d4ee" strokeWidth={0.5} />
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
                    default: { outline: 'none', cursor: isTracked ? 'pointer' : 'default' },
                    hover:   { outline: 'none', fill: isSA ? lighten(baseColor) : '#c8d4da' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={isSA ? (e) => setTooltip({
                    name, isTracked,
                    avg:     key ? (avgByCountry[key] ?? 0) : null,
                    trained: key ? (countByCountry[key] ?? 0) : 0,
                    x: e.clientX, y: e.clientY,
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
            <div className="text-gray-400 mt-0.5">No rastreado</div>
          )}
        </div>
      )}

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
    </div>
  )
}
