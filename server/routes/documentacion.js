const express = require('express')
const router = express.Router()
const { getPool } = require('../db')

// GET /api/documentacion/folders
router.get('/folders', async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.query('SELECT * FROM doc_folders ORDER BY orden, nombre')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/documentacion/folders
router.post('/folders', async (req, res) => {
  const { nombre, icono = '📁' } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  try {
    const pool = await getPool()
    const result = await pool.query(
      'INSERT INTO doc_folders (nombre, icono) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), icono]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/documentacion/folders/:id
router.delete('/folders/:id', async (req, res) => {
  try {
    const pool = await getPool()
    await pool.query('DELETE FROM doc_folders WHERE id = $1', [Number(req.params.id)])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/documentacion/folders/:id/items
router.get('/folders/:id/items', async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.query(
      'SELECT * FROM doc_items WHERE folder_id = $1 ORDER BY orden, nombre',
      [Number(req.params.id)]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/documentacion/folders/:id/items
router.post('/folders/:id/items', async (req, res) => {
  const { nombre, url, tipo = '🔗' } = req.body
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
  if (!url?.trim())    return res.status(400).json({ error: 'URL requerida' })
  try {
    const pool = await getPool()
    const result = await pool.query(
      'INSERT INTO doc_items (folder_id, nombre, url, tipo) VALUES ($1, $2, $3, $4) RETURNING *',
      [Number(req.params.id), nombre.trim(), url.trim(), tipo]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/documentacion/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const pool = await getPool()
    await pool.query('DELETE FROM doc_items WHERE id = $1', [Number(req.params.id)])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
