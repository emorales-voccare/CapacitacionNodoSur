const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function initDB() {
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

module.exports = { pool, initDB }
