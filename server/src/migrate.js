// Applique les fichiers migrations/NNN_*.sql qui ne l'ont pas encore été.
// Usage : npm run migrate   (lit DATABASE_URL)
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createPool, withTransaction } from './db.js'
import { config } from './config.js'

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

export async function migrate(pool, log = console.log) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    await withTransaction(pool, async (c) => {
      await c.query(sql)
      await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    })
    log(`migration appliquée : ${file}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createPool(config.databaseUrl)
  migrate(pool).then(() => pool.end()).catch((e) => { console.error(e); process.exit(1) })
}
