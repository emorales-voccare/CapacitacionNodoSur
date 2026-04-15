import { useState } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'

const GEO_URL = '/countries-110m.json'

// ISO numeric codes de países de Sudamérica
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

// Mapa de código ISO numérico → clave de la DB
const ISO_TO_KEY = {
  '032': 'argentina',
  '068': 'bolivia',
  '152': 'chile',
  '218': 'ecuador',
  '600': 'paraguay',
  '604': 'peru',
  '858': 'uruguay',
}

// Colores fijos por país
const COUNTRY_COLORS = {
  argentina: '#5DADE2', // Azul Celeste
  chile:     '#E57373', // Rojo Soft
  ecuador:   '#C9A84C', // Amarillo Ocre
  peru:      '#7B1C2E', // Granate/Rojo Oscuro
  bolivia:   '#2E7D4F', // Verde Bosque
  paraguay:  '#1A3A5C', // Azul Marino
  uruguay:   '#7F9BAD', // Gris Azulado
}

// Nombres en español
const COUNTRY_NAMES = {
  '032': 'Argentina',
  '068': 'Bolivia',
  '076': 'Brasil',
  '152': 'Chile',
  '170': 'Colombia',
  '218': 'Ecuador',
  '328': 'Guyana',
  '600': 'Paraguay',
  '604': 'Perú',
  '740': 'Suriname',
  '858': 'Uruguay',
  '862': 'Venezuela',
  '254': 'Guayana Francesa',
}

function getColor(key) {
  return key ? COUNTRY_COLORS[key] : '#d1d5db' // gris para países no rastreados
}

// Aclara el color del país para el hover
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 40)
  const g = Math.min(255, ((n >> 8)  & 0xff) + 40)
  const b = Math.min(255, ( n        & 0xff) + 40)
  return `rgb(${r},${g},${b})`
}

export default function SouthAmericaMap({ avgByCountry, countByCountry = {}, total = 0, onCountryClick }) {
  const [tooltip, setTooltip] = useState(null)

  // avgByCountry: { argentina: 75, chile: 50, ... }

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-60, -18], scale: 255 }}
        width={400}
        height={310}
        style={{ width: '100%', height: 'auto' }}
      >
        <ZoomableGroup>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter(geo => SOUTH_AMERICA.has(geo.id))
                .map(geo => {
                  const key = ISO_TO_KEY[geo.id]
                  const avg = key !== undefined ? (avgByCountry[key] ?? 0) : null
                  const isTracked = key !== undefined
                  const color = getColor(key)
                  const name = COUNTRY_NAMES[geo.id] || geo.properties?.name

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{
                        default: { outline: 'none', cursor: isTracked ? 'pointer' : 'default' },
                        hover: { outline: 'none', fill: isTracked ? lighten(color) : '#e5e7eb' },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={(e) => {
                        setTooltip({
                          name,
                          avg,
                          isTracked,
                          trained: key ? (countByCountry[key] ?? 0) : 0,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }}
                      onMouseMove={(e) => {
                        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => { if (isTracked && onCountryClick) onCountryClick(key) }}
                    />
                  )
                })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="font-bold text-sm">{tooltip.name}</div>
          {tooltip.isTracked ? (
            <div className="mt-1 space-y-0.5">
              <div>Capacitados (100%): <span className="font-bold text-green-400">{tooltip.trained} / {total}</span></div>
              <div>Promedio general: <span className="font-bold">{tooltip.avg}%</span></div>
            </div>
          ) : (
            <div className="text-gray-400 mt-0.5">No rastreado</div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs text-gray-600">
        {Object.entries(COUNTRY_COLORS).map(([key, color]) => {
          const name = Object.entries(ISO_TO_KEY).map(([iso, k]) => k === key ? COUNTRY_NAMES[iso] : null).find(Boolean)
          return (
            <div key={key} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
              <span>{name}</span>
            </div>
          )
        })}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-300" />
          <span>Sin rastrear</span>
        </div>
      </div>
    </div>
  )
}
