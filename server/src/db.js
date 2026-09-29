import pg from 'pg'

// Les dates SQL (type date) restent des chaînes 'AAAA-MM-JJ' côté JavaScript,
// pour éviter tout décalage de fuseau horaire sur les ressentis du jour.
pg.types.setTypeParser(1082, (v) => v)

export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 })
}

// Exécute fn dans une transaction ; annule tout en cas d'erreur
export async function withTransaction(pool, fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
