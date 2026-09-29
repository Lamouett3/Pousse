// Point d'entrée : applique les migrations puis démarre l'API
import { buildApp, startSessionCleanup } from './app.js'
import { createPusher, startReminderScheduler } from './reminders.js'
import { createPool } from './db.js'
import { migrate } from './migrate.js'
import { config } from './config.js'

const pool = createPool(config.databaseUrl)
await migrate(pool)
const pusher = createPusher(config)
const app = await buildApp({ pool, config, logger: { level: config.logLevel }, pusher })
startSessionCleanup(pool, app.log)
// Rappel du soir : vérifié chaque minute (rien si les clés VAPID sont absentes)
startReminderScheduler(pool, pusher, app.log)
if (!pusher) app.log.info('Rappel du soir désactivé : VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY absents')

const shutdown = async () => { await app.close(); await pool.end(); process.exit(0) }
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

await app.listen({ port: config.port, host: config.host })
