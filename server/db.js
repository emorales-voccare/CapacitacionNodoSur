const { Pool } = require('pg')
const dns = require('dns').promises

let pool

async function getPool() {
  if (pool) return pool

  let connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL no configurada')

  // Forzar IPv4: resolver el hostname y reemplazarlo por su IP
  try {
    const url = new URL(connectionString)
    const addresses = await dns.resolve4(url.hostname)
    url.hostname = addresses[0]
    connectionString = url.toString()
  } catch {
    // Si falla la resolución, intentar con el string original
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  return pool
}

async function initDB() {
  const pool = await getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coordinadores (
      id         SERIAL PRIMARY KEY,
      nombre     TEXT NOT NULL,
      argentina  INTEGER DEFAULT 0 CHECK(argentina IN (0, 50, 100)),
      chile      INTEGER DEFAULT 0 CHECK(chile IN (0, 50, 100)),
      ecuador    INTEGER DEFAULT 0 CHECK(ecuador IN (0, 50, 100)),
      peru       INTEGER DEFAULT 0 CHECK(peru IN (0, 50, 100)),
      bolivia    INTEGER DEFAULT 0 CHECK(bolivia IN (0, 50, 100)),
      paraguay   INTEGER DEFAULT 0 CHECK(paraguay IN (0, 50, 100)),
      uruguay    INTEGER DEFAULT 0 CHECK(uruguay IN (0, 50, 100)),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

module.exports = { getPool, initDB }
