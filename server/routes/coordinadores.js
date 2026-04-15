const express = require('express')
const router = express.Router()
const { pool } = require('../db')

const COUNTRIES = ['argentina', 'chile', 'ecuador', 'peru', 'bolivia', 'paraguay', 'uruguay']

function validateCountryValues(body) {
  for (const country of COUNTRIES) {
    const val = body[country]
    if (val !== undefined && ![0, 50, 100].includes(Number(val))) {
      return `Valor inválido para ${country}: debe ser 0, 50 o 100`
    }
  }
  return null
}

// GET /api/coordinadores
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coordinadores ORDER BY nombre')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/coordinadores
router.post('/', async (req, res) => {
  const { nombre, argentina = 0, chile = 0, ecuador = 0, peru = 0, bolivia = 0, paraguay = 0, uruguay = 0 } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  const err = validateCountryValues(req.body)
  if (err) return res.status(400).json({ error: err })

  try {
    const result = await pool.query(
      `INSERT INTO coordinadores (nombre, argentina, chile, ecuador, peru, bolivia, paraguay, uruguay)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre.trim(), argentina, chile, ecuador, peru, bolivia, paraguay, uruguay]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/coordinadores/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, argentina = 0, chile = 0, ecuador = 0, peru = 0, bolivia = 0, paraguay = 0, uruguay = 0 } = req.body

  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  const err = validateCountryValues(req.body)
  if (err) return res.status(400).json({ error: err })

  try {
    const result = await pool.query(
      `UPDATE coordinadores
       SET nombre = $1, argentina = $2, chile = $3, ecuador = $4,
           peru = $5, bolivia = $6, paraguay = $7, uruguay = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [nombre.trim(), argentina, chile, ecuador, peru, bolivia, paraguay, uruguay, Number(id)]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coordinador no encontrado' })
    }

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/coordinadores/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query('DELETE FROM coordinadores WHERE id = $1', [Number(id)])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coordinador no encontrado' })
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
