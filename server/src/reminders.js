// =============================================================
// Rappel du soir : « moment d'écoute » envoyé en notification push Web.
//
// - Désactivé par défaut, activé appareil par appareil depuis le Profil.
// - Envoyé à l'heure choisie (heure locale de l'appareil), dans une fenêtre de
//   2 heures, au plus une fois par jour, jamais après minuit.
// - Pas envoyé si le ressenti du jour est déjà noté : le but est d'inviter à
//   s'écouter, pas de relancer.
// - Le contenu est générique : aucune donnée de santé ne transite par les
//   services de push (Google, Mozilla, Apple).
//
// Clés VAPID : `npx web-push generate-vapid-keys`, puis VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY et VAPID_SUBJECT dans .env. Sans clés, la fonction est
// simplement indisponible (l'app propose alors le rappel « app ouverte »).
// =============================================================
import webpush from 'web-push'

// Même esprit que src/data/reminders.js (mode local) : doux, sans culpabiliser.
export const REMINDER_MESSAGES = [
  { title: 'Un moment pour toi', body: 'La journée touche à sa fin. Prends un instant pour écouter ton corps : comment te sens-tu ce soir ?' },
  { title: 'Une pause, une respiration', body: 'Que ta journée ait été douce ou difficile, ton ressenti compte. Quelques secondes suffisent.' },
  { title: 'Ton jardin t\u2019attend', body: 'Note comment tu te sens aujourd\u2019hui, que ça aille bien ou moins bien. C\u2019est ton moment d\u2019écoute.' },
  { title: 'Et toi, comment vas-tu ?', body: 'Avant de tourner la page de la journée, un petit moment d\u2019attention pour ton corps.' },
  { title: 'Moment d\u2019écoute', body: 'Ferme les yeux un instant. Qu\u2019est-ce que ton corps te dit ce soir ?' },
]

// Services de push des navigateurs. L'API n'envoie de requêtes qu'à ces
// hôtes : un abonnement forgé ne peut pas faire appeler une adresse interne.
export const DEFAULT_PUSH_HOSTS = [
  'fcm.googleapis.com', 'android.googleapis.com',           // Chrome, Edge, Android
  'updates.push.services.mozilla.com', 'push.services.mozilla.com', // Firefox
  '.push.apple.com',                                         // Safari (macOS, iOS 16.4+)
  '.notify.windows.com',                                     // anciens Edge
]

export function isAllowedEndpoint(endpoint, hosts = DEFAULT_PUSH_HOSTS) {
  let u
  try { u = new URL(endpoint) } catch { return false }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false
  const h = u.hostname.toLowerCase()
  return hosts.some((a) => (a.startsWith('.') ? h.endsWith(a) && h.length > a.length : h === a))
}

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: tz }); return true } catch { return false }
}

// Envoi réel (web-push) ; remplacé par un faux dans les tests
export function createPusher(config) {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) return null
  webpush.setVapidDetails(config.vapidSubject || 'mailto:contact@localhost', config.vapidPublicKey, config.vapidPrivateKey)
  return {
    publicKey: config.vapidPublicKey,
    async send(sub, payload) {
      const res = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 3 * 3600, urgency: 'normal', topic: 'ecoute' },
      )
      return { statusCode: res.statusCode }
    },
  }
}

export function reminderPayload(rng = Math.random) {
  const m = REMINDER_MESSAGES[Math.floor(rng() * REMINDER_MESSAGES.length)]
  return { ...m, url: '/?ecoute=1', tag: 'pousse-ecoute' }
}

// Un passage du planificateur. `now` est injectable pour les tests.
// Les abonnements dus sont « réservés » (last_sent_day = jour local) dans la
// même requête : deux instances de l'API n'envoient jamais deux fois.
export async function runReminders(pool, pusher, log = console, now = new Date()) {
  if (!pusher) return { sent: 0, skipped: 0, removed: 0 }
  const { rows } = await pool.query(`
    WITH due AS (
      SELECT endpoint, ($1::timestamptz AT TIME ZONE timezone) AS lt
      FROM push_subscriptions
      WHERE ($1::timestamptz AT TIME ZONE timezone)::time >= reminder_time
        AND ($1::timestamptz AT TIME ZONE timezone) < ($1::timestamptz AT TIME ZONE timezone)::date + reminder_time + interval '2 hours'
        AND (last_sent_day IS NULL OR last_sent_day < ($1::timestamptz AT TIME ZONE timezone)::date)
      FOR UPDATE SKIP LOCKED
    )
    UPDATE push_subscriptions s SET last_sent_day = due.lt::date
    FROM due WHERE s.endpoint = due.endpoint
    RETURNING s.endpoint, s.p256dh, s.auth, s.user_id, to_char(due.lt, 'YYYY-MM-DD') AS local_day`, [now.toISOString()])

  let sent = 0, skipped = 0, removed = 0
  for (const sub of rows) {
    // Ressenti du jour déjà noté (quel que soit l'appareil) : pas de rappel
    const done = await pool.query('SELECT 1 FROM feelings WHERE user_id = $1 AND day = $2 AND NOT deleted', [sub.user_id, sub.local_day])
    if (done.rows.length) { skipped++; continue }
    try {
      await pusher.send(sub, reminderPayload())
      sent++
    } catch (e) {
      // Abonnement expiré ou révoqué par le navigateur : on l'oublie
      if (e.statusCode === 404 || e.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint])
        removed++
      } else {
        log.error?.({ err: e.message, status: e.statusCode, host: new URL(sub.endpoint).hostname }, 'rappel non envoyé')
      }
    }
  }
  return { sent, skipped, removed }
}

export function startReminderScheduler(pool, pusher, log) {
  if (!pusher) return null
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try { await runReminders(pool, pusher, log) } catch (e) { log.error(e) } finally { running = false }
  }
  const t = setInterval(tick, 60 * 1000)
  t.unref()
  tick()
  return t
}
