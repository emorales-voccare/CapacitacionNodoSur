const express = require('express')
const router = express.Router()
const { getPool } = require('../db')

const COUNTRY_MAP = {
  'argentina': 'argentina',
  'chile': 'chile',
  'ecuador': 'ecuador',
  'perú': 'peru',
  'peru': 'peru',
  'bolivia': 'bolivia',
  'paraguay': 'paraguay',
  'uruguay': 'uruguay',
}

function buildExportUrl(url) {
  if (url.includes('/export?')) return url

  const sheetMatch = url.match(/spreadsheets\/d\/([^/]+)/)
  const gidMatch = url.match(/[#&?]gid=(\d+)/)
  if (!sheetMatch) throw new Error('URL de Google Sheets inválida')

  const sheetId = sheetMatch[1]
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

async function fetchCsv(exportUrl) {
  const response = await fetch(exportUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!response.ok) {
    throw new Error(`No se pudo acceder al archivo (HTTP ${response.status}). Verificá que la hoja sea pública.`)
  }
  return response.text()
}

function parseCsv(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('El CSV está vacío o no tiene datos')

  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["\r]/g, ''))
  const coordinadorCol = rawHeaders.findIndex(h => h === 'coordinador' || h === 'nombre')
  if (coordinadorCol === -1) throw new Error('No se encontró la columna "Coordinador" en la hoja')

  const coordinadores = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/["\r]/g, ''))
    const nombre = values[coordinadorCol]
    if (!nombre) continue

    const row = { nombre }
    rawHeaders.forEach((h, idx) => {
      const col = COUNTRY_MAP[h]
      if (col) row[col] = parseInt(values[idx]) || 0
    })

    // Fill missing countries with 0
    for (const col of Object.values(COUNTRY_MAP)) {
      if (row[col] === undefined) row[col] = 0
    }

    coordinadores.push(row)
  }

  return coordinadores
}

// POST /api/import/preview
router.post('/preview', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL requerida' })

  try {
    const exportUrl = buildExportUrl(url)
    const text = await fetchCsv(exportUrl)
    const coordinadores = parseCsv(text)
    res.json({ coordinadores, total: coordinadores.length })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/import/confirm
router.post('/confirm', async (req, res) => {
  const { coordinadores, mode = 'replace' } = req.body
  if (!Array.isArray(coordinadores) || coordinadores.length === 0) {
    return res.status(400).json({ error: 'No hay datos para importar' })
  }

  const client = await (await getPool()).connect()
  try {
    await client.query('BEGIN')

    if (mode === 'replace') {
      await client.query('DELETE FROM coordinadores')
    }

    for (const c of coordinadores) {
      await client.query(
        `INSERT INTO coordinadores (nombre, argentina, chile, ecuador, peru, bolivia, paraguay, uruguay)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          c.nombre,
          c.argentina ?? 0,
          c.chile ?? 0,
          c.ecuador ?? 0,
          c.peru ?? 0,
          c.bolivia ?? 0,
          c.paraguay ?? 0,
          c.uruguay ?? 0,
        ]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, imported: coordinadores.length, mode })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
