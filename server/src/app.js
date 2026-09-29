// =============================================================
// API Pousse
//   /api/auth/*     comptes et sessions (cookie httpOnly)
//   /api/sync       synchronisation (envoi + réception en un seul appel)
//   /api/account/*  export complet (RGPD art. 20) et suppression (art. 17)
//   /api/push/*     rappel du soir (notifications push, désactivé par défaut)
//   /api/health     état du service
//
// Règles de sécurité :
//   - chaque requête sur des données est filtrée par l'utilisateur de la session ;
//   - mots de passe hachés avec scrypt, jetons de session stockés hachés ;
//   - requêtes d'écriture : en-tête X-Pousse-Client obligatoire (anti-CSRF) ;
//   - limitation de débit, surtout sur la connexion et l'inscription ;
//   - réponses de l'API jamais mises en cache (Cache-Control: no-store) ;
//   - Content-Security-Policy stricte sur l'application servie ;
//   - consentement explicite aux données de santé exigé avant toute synchronisation.
// =============================================================
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { withTransaction } from './db.js'
import { hashPassword, verifyPassword, dummyVerify, newSessionToken, hashToken, nameKey } from './security.js'
import { createMailer } from './mailer.js'
import { createPusher, isAllowedEndpoint, isValidTimeZone, reminderPayload, DEFAULT_PUSH_HOSTS } from './reminders.js'

const COOKIE = 'pousse_session'
const MAX_RECORDS = 5000          // par type et par synchronisation
const MAX_RECORD_BYTES = 20000    // taille maximale d'un enregistrement (JSON)
const ID = { type: 'string', minLength: 1, maxLength: 100 }
const ISO = { type: 'string', minLength: 10, maxLength: 40 }
const DAY = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }

const credentials = {
  type: 'object',
  required: ['name', 'password'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 254 },   // nom, ou adresse e-mail à la connexion
    password: { type: 'string', minLength: 1, maxLength: 200 },
    email: { type: 'string', maxLength: 254 },
    healthConsent: { type: 'boolean' },   // inscription : consentement aux données de santé
    ageConfirmed: { type: 'boolean' },    // inscription : âge minimum déclaré
  },
}
const recordList = (key) => ({
  type: 'array',
  maxItems: MAX_RECORDS,
  items: {
    type: 'object',
    required: [key, 'updatedAt'],
    additionalProperties: false,
    properties: { [key]: key === 'day' ? DAY : ID, data: { type: 'object' }, updatedAt: ISO, deleted: { type: 'boolean' } },
  },
})
const syncSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      cursor: { type: 'string', pattern: '^\\d{1,19}$' },
      changes: {
        type: 'object',
        additionalProperties: false,
        properties: {
          profile: {
            type: 'object', required: ['data', 'updatedAt'], additionalProperties: false,
            properties: { data: { type: 'object' }, updatedAt: ISO },
          },
          episodes: recordList('id'),
          shortcuts: recordList('id'),
          feelings: recordList('day'),
        },
      },
    },
  },
}

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.statusCode = status; this.code = code }
}

function validDate(v) {
  const t = Date.parse(v)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}
function checkSize(obj) {
  if (JSON.stringify(obj ?? {}).length > MAX_RECORD_BYTES) throw new HttpError(413, 'Enregistrement trop volumineux')
}
function cleanName(name) {
  const n = String(name).trim().replace(/\s+/g, ' ')
  if (!n || n.length > 40 || /[\u0000-\u001f\u007f]/.test(n)) throw new HttpError(400, 'Nom invalide')
  return n
}
// Adresse e-mail : format simple, normalisée en minuscules pour l'unicité
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function cleanEmail(email) {
  const e = String(email || '').trim()
  if (!EMAIL_RE.test(e) || e.length > 254) throw new HttpError(400, 'Indique une adresse e-mail valide')
  return e
}
const RESET_MINUTES = 30

// Version du texte de consentement affiché à l'inscription (src/components/HealthConsent.jsx).
// À augmenter à chaque modification du texte : les comptes ayant accepté une
// version antérieure devront accepter la nouvelle avant de synchroniser.
export const CONSENT_VERSION = '2026-09-27'
const CONSENT_REQUIRED_MESSAGE = 'Ton accord pour le traitement de tes données de santé est nécessaire'
function checkConsent(body) {
  if (body.healthConsent !== true) throw new HttpError(400, 'Coche la case d\u2019accord sur tes données de santé pour continuer', 'consent_required')
  if (body.ageConfirmed !== true) throw new HttpError(400, 'Confirme que tu as l\u2019âge minimum pour utiliser Pousse', 'age_required')
}
const needsConsent = (u) => !u.health_consent_at || u.health_consent_version !== CONSENT_VERSION || !u.age_confirmed_at

function checkNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) throw new HttpError(400, 'Choisis un mot de passe d\u2019au moins 8 caractères')
}

export async function buildApp({ pool, config, logger = true, mailer, pusher }) {
  const app = Fastify({ logger, bodyLimit: 5 * 1024 * 1024, trustProxy: true })
  const mail = mailer || createMailer(config, app.log)
  // undefined : créé depuis la configuration ; null : rappels indisponibles
  const push = pusher === undefined ? createPusher(config) : pusher
  const pushHosts = config.pushHosts?.length ? config.pushHosts : DEFAULT_PUSH_HOSTS

  // Content-Security-Policy : seuls les scripts du site lui-même peuvent s'exécuter.
  //  - style-src 'unsafe-inline' : nécessaire aux styles React (attribut style) et aux
  //    feuilles <style> générées (thème, jardin). Aucun script inline n'est autorisé.
  //  - connect-src : l'API (même origine) et la météo Open-Meteo.
  //  - upgrade-insecure-requests seulement en HTTPS (sinon le local en HTTP casse).
  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://api.open-meteo.com'],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(config.cookieSecure ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
  await app.register(cookie)
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })

  // CORS minimal, seulement si l'application est servie depuis une autre origine
  if (config.appOrigin) {
    app.addHook('onRequest', async (req, reply) => {
      if (req.headers.origin === config.appOrigin) {
        reply.header('Access-Control-Allow-Origin', config.appOrigin)
        reply.header('Access-Control-Allow-Credentials', 'true')
        reply.header('Vary', 'Origin')
        if (req.method === 'OPTIONS') {
          reply.header('Access-Control-Allow-Methods', 'GET,POST,DELETE')
          reply.header('Access-Control-Allow-Headers', 'Content-Type, X-Pousse-Client')
          return reply.code(204).send()
        }
      }
    })
  }

  // Anti-CSRF : un formulaire d'un autre site ne peut pas poser cet en-tête
  app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
      && req.headers['x-pousse-client'] !== '1') {
      throw new HttpError(403, 'Requête refusée')
    }
  })

  // Les réponses de l'API contiennent des données de santé : aucune mise en cache,
  // ni par le navigateur ni par un intermédiaire (y compris les réponses d'erreur).
  app.addHook('onSend', async (req, reply, payload) => {
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store')
    return payload
  })

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode || 500
    if (status >= 500) req.log.error(err)
    const message = status === 400 && err.validation ? 'Données invalides' : status >= 500 ? 'Erreur du serveur' : err.message
    reply.code(status).send(err instanceof HttpError && err.code ? { error: message, code: err.code } : { error: message })
  })

  // ---- Sessions ----
  async function openSession(reply, userId, userAgent) {
    const token = newSessionToken()
    const expires = new Date(Date.now() + config.sessionDays * 86400000)
    await pool.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()', [userId])
    await pool.query(
      'INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)',
      [hashToken(token), userId, expires, String(userAgent || '').slice(0, 200)])
    reply.setCookie(COOKIE, token, {
      path: '/', httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: config.sessionDays * 86400,
    })
  }

  // Charge l'utilisateur de la session ; prolonge la session si elle est active
  async function requireUser(req) {
    const token = req.cookies[COOKIE]
    if (!token) throw new HttpError(401, 'Non connecté')
    const { rows } = await pool.query(
      `UPDATE sessions SET last_used_at = now(),
         expires_at = CASE WHEN last_used_at < now() - interval '1 day'
                           THEN now() + make_interval(days => $2) ELSE expires_at END
       WHERE token_hash = $1 AND expires_at > now()
       RETURNING user_id`, [hashToken(token), config.sessionDays])
    if (!rows.length) throw new HttpError(401, 'Session expirée')
    const u = await pool.query('SELECT id, name, email, created_at, health_consent_at, health_consent_version, age_confirmed_at FROM users WHERE id = $1', [rows[0].user_id])
    if (!u.rows.length) throw new HttpError(401, 'Compte introuvable')
    req.user = u.rows[0]
  }
  const publicUser = (u) => ({
    id: u.id, name: u.name, email: u.email || null, createdAt: u.created_at,
    healthConsentAt: u.health_consent_at || null, consentRequired: needsConsent(u),
  })
  // Connexion / inscription : 10 tentatives par minute et par adresse IP (réglable)
  const authLimit = { config: { rateLimit: { max: config.authMaxPerMinute || 10, timeWindow: '1 minute' } } }

  // ---- Comptes ----
  app.post('/api/auth/register', { ...authLimit, schema: { body: credentials } }, async (req, reply) => {
    const name = cleanName(req.body.name)
    if (name.includes('@')) throw new HttpError(400, 'Le nom ne peut pas contenir « @ »')
    const email = cleanEmail(req.body.email)
    checkNewPassword(req.body.password)
    checkConsent(req.body)
    const hash = await hashPassword(req.body.password)
    let user
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (name, name_key, password_hash, email, email_key, health_consent_at, health_consent_version, age_confirmed_at)
         VALUES ($1, $2, $3, $4, $5, now(), $6, now())
         RETURNING id, name, email, created_at, health_consent_at, health_consent_version, age_confirmed_at`,
        [name, nameKey(name), hash, email, email.toLowerCase(), CONSENT_VERSION])
      user = rows[0]
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, e.constraint?.includes('email') ? 'Cette adresse e-mail est déjà utilisée' : 'Ce nom est déjà pris')
      throw e
    }
    await openSession(reply, user.id, req.headers['user-agent'])
    return reply.code(201).send({ user: publicUser(user) })
  })

  app.post('/api/auth/login', { ...authLimit, schema: { body: credentials } }, async (req, reply) => {
    const ident = req.body.name.trim()
    const { rows } = ident.includes('@')
      ? await pool.query('SELECT id, name, email, created_at, health_consent_at, health_consent_version, age_confirmed_at, password_hash FROM users WHERE email_key = $1', [ident.toLowerCase()])
      : await pool.query('SELECT id, name, email, created_at, health_consent_at, health_consent_version, age_confirmed_at, password_hash FROM users WHERE name_key = $1', [nameKey(ident)])
    const ok = rows.length ? await verifyPassword(req.body.password, rows[0].password_hash) : await dummyVerify(req.body.password)
    if (!ok) throw new HttpError(401, 'Nom ou mot de passe incorrect')
    await openSession(reply, rows[0].id, req.headers['user-agent'])
    return { user: publicUser(rows[0]) }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies[COOKIE]
    if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    reply.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/api/auth/me', async (req) => {
    await requireUser(req)
    return { user: publicUser(req.user) }
  })

  app.post('/api/auth/password', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['currentPassword', 'newPassword'], additionalProperties: false,
      properties: { currentPassword: { type: 'string', maxLength: 200 }, newPassword: { type: 'string', maxLength: 200 } } } },
  }, async (req) => {
    await requireUser(req)
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (!(await verifyPassword(req.body.currentPassword, rows[0].password_hash))) throw new HttpError(401, 'Mot de passe actuel incorrect')
    checkNewPassword(req.body.newPassword)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.newPassword), req.user.id])
    // Déconnecte les autres appareils
    await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [req.user.id, hashToken(req.cookies[COOKIE])])
    return { ok: true }
  })

  // ---- Mot de passe oublié ----
  // Réponse toujours identique, que l'adresse existe ou non (pas d'énumération) ;
  // l'e-mail part en arrière-plan pour que le temps de réponse ne trahisse rien.
  app.post('/api/auth/forgot', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['email'], additionalProperties: false, properties: { email: { type: 'string', maxLength: 254 } } } },
  }, async (req) => {
    const email = String(req.body.email).trim().toLowerCase()
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE email_key = $1', [email])
    if (rows.length) {
      const user = rows[0]
      await pool.query('DELETE FROM password_resets WHERE user_id = $1 AND (expires_at < now() OR used_at IS NOT NULL)', [user.id])
      const recent = await pool.query("SELECT count(*)::int n FROM password_resets WHERE user_id = $1 AND created_at > now() - interval '1 hour'", [user.id])
      if (recent.rows[0].n < 3) {
        const token = newSessionToken()
        await pool.query('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))',
          [hashToken(token), user.id, RESET_MINUTES])
        const link = `${config.appUrl}/?reset=${encodeURIComponent(token)}`
        mail.send({
          to: user.email,
          subject: 'Pousse : réinitialiser ton mot de passe',
          text: `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable ${RESET_MINUTES} minutes, une seule fois) :\n${link}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.\n\nPousse`,
        }).catch((e) => req.log.error(e))
      }
    }
    return { ok: true }
  })

  app.post('/api/auth/reset', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['token', 'password'], additionalProperties: false,
      properties: { token: { type: 'string', minLength: 20, maxLength: 200 }, password: { type: 'string', maxLength: 200 } } } },
  }, async (req) => {
    checkNewPassword(req.body.password)
    const hash = await hashPassword(req.body.password)
    return withTransaction(pool, async (c) => {
      const { rows } = await c.query(
        'UPDATE password_resets SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id',
        [hashToken(req.body.token)])
      if (!rows.length) throw new HttpError(400, 'Ce lien est invalide ou a expiré. Refais une demande.')
      const userId = rows[0].user_id
      await c.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId])
      await c.query('DELETE FROM password_resets WHERE user_id = $1 AND token_hash <> $2', [userId, hashToken(req.body.token)])
      await c.query('DELETE FROM sessions WHERE user_id = $1', [userId])   // déconnecte tous les appareils
      return { ok: true }
    })
  })

  // Ajout ou modification de l'adresse e-mail (mot de passe exigé)
  app.post('/api/account/email', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['email', 'password'], additionalProperties: false,
      properties: { email: { type: 'string', maxLength: 254 }, password: { type: 'string', maxLength: 200 } } } },
  }, async (req) => {
    await requireUser(req)
    const email = cleanEmail(req.body.email)
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (!(await verifyPassword(req.body.password, rows[0].password_hash))) throw new HttpError(401, 'Mot de passe incorrect')
    try {
      await pool.query('UPDATE users SET email = $1, email_key = $2 WHERE id = $3', [email, email.toLowerCase(), req.user.id])
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'Cette adresse e-mail est déjà utilisée')
      throw e
    }
    return { user: publicUser({ ...req.user, email }) }
  })

  // Consentement aux données de santé pour un compte existant (créé avant la
  // version 11, ou texte de consentement mis à jour). Retirer son consentement =
  // supprimer son compte (DELETE /api/account), ce qui efface toutes les données.
  app.post('/api/account/consent', {
    schema: { body: { type: 'object', required: ['healthConsent', 'ageConfirmed'], additionalProperties: false,
      properties: { healthConsent: { type: 'boolean' }, ageConfirmed: { type: 'boolean' } } } },
  }, async (req) => {
    await requireUser(req)
    checkConsent(req.body)
    const { rows } = await pool.query(
      `UPDATE users SET health_consent_at = now(), health_consent_version = $2, age_confirmed_at = now()
       WHERE id = $1 RETURNING id, name, email, created_at, health_consent_at, health_consent_version, age_confirmed_at`,
      [req.user.id, CONSENT_VERSION])
    return { user: publicUser(rows[0]) }
  })

  // ---- Synchronisation ----
  app.post('/api/sync', { schema: syncSchema }, async (req) => {
    await requireUser(req)
    // Pas de consentement valide : aucune donnée de santé n'est reçue ni renvoyée
    if (needsConsent(req.user)) throw new HttpError(403, CONSENT_REQUIRED_MESSAGE, 'consent_required')
    const userId = req.user.id
    const cursor = req.body.cursor || '0'
    const ch = req.body.changes || {}
    return withTransaction(pool, async (c) => {
      // Une seule synchronisation à la fois par compte : aucune écriture ne peut
      // être « oubliée » entre deux lectures de révision.
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [userId])

      // Règle de conflit : la modification la plus récente (updatedAt) l'emporte.
      if (ch.profile) {
        checkSize(ch.profile.data)
        const at = validDate(ch.profile.updatedAt)
        if (!at) throw new HttpError(400, 'Date invalide')
        await c.query(
          `INSERT INTO profiles (user_id, data, updated_at, rev) VALUES ($1, $2, $3, nextval('sync_rev'))
           ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, rev = EXCLUDED.rev
           WHERE profiles.updated_at <= EXCLUDED.updated_at`, [userId, ch.profile.data, at])
      }
      for (const e of ch.episodes || []) {
        const d = e.deleted ? {} : (e.data || {})
        checkSize(d)
        const at = validDate(e.updatedAt)
        if (!at) throw new HttpError(400, 'Date invalide')
        const intensity = Number.isInteger(d.intensity) && d.intensity >= 0 && d.intensity <= 10 ? d.intensity : null
        await c.query(
          `INSERT INTO episodes (user_id, id, data, occurred_at, condition, intensity, updated_at, deleted, rev)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, nextval('sync_rev'))
           ON CONFLICT (user_id, id) DO UPDATE SET data = EXCLUDED.data, occurred_at = EXCLUDED.occurred_at,
             condition = EXCLUDED.condition, intensity = EXCLUDED.intensity, updated_at = EXCLUDED.updated_at,
             deleted = EXCLUDED.deleted, rev = EXCLUDED.rev
           WHERE episodes.updated_at <= EXCLUDED.updated_at`,
          [userId, e.id, d, validDate(d.createdAt), typeof d.condition === 'string' ? d.condition.slice(0, 60) : null,
            intensity, at, !!e.deleted])
      }
      for (const s of ch.shortcuts || []) {
        const d = s.deleted ? {} : (s.data || {})
        checkSize(d)
        const at = validDate(s.updatedAt)
        if (!at) throw new HttpError(400, 'Date invalide')
        await c.query(
          `INSERT INTO shortcuts (user_id, id, data, updated_at, deleted, rev) VALUES ($1, $2, $3, $4, $5, nextval('sync_rev'))
           ON CONFLICT (user_id, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at,
             deleted = EXCLUDED.deleted, rev = EXCLUDED.rev
           WHERE shortcuts.updated_at <= EXCLUDED.updated_at`, [userId, s.id, d, at, !!s.deleted])
      }
      for (const f of ch.feelings || []) {
        const d = f.deleted ? {} : (f.data || {})
        checkSize(d)
        const at = validDate(f.updatedAt)
        if (!at) throw new HttpError(400, 'Date invalide')
        await c.query(
          `INSERT INTO feelings (user_id, day, data, updated_at, deleted, rev) VALUES ($1, $2, $3, $4, $5, nextval('sync_rev'))
           ON CONFLICT (user_id, day) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at,
             deleted = EXCLUDED.deleted, rev = EXCLUDED.rev
           WHERE feelings.updated_at <= EXCLUDED.updated_at`, [userId, f.day, d, at, !!f.deleted])
      }

      // Tout ce qui a changé depuis le curseur de l'appareil (y compris ses propres envois)
      // Requêtes l'une après l'autre : un client de transaction n'en exécute
      // qu'une à la fois (en parallèle, pg les met en file et le déconseille).
      const q = (sql) => c.query(sql, [userId, cursor]).then((r) => r.rows)
      const prof = await q('SELECT data, updated_at, rev FROM profiles WHERE user_id = $1 AND rev > $2')
      const eps = await q('SELECT id, data, updated_at, deleted, rev FROM episodes WHERE user_id = $1 AND rev > $2 ORDER BY rev')
      const shs = await q('SELECT id, data, updated_at, deleted, rev FROM shortcuts WHERE user_id = $1 AND rev > $2 ORDER BY rev')
      const fls = await q('SELECT day, data, updated_at, deleted, rev FROM feelings WHERE user_id = $1 AND rev > $2 ORDER BY rev')
      let max = BigInt(cursor)
      for (const r of [...prof, ...eps, ...shs, ...fls]) if (BigInt(r.rev) > max) max = BigInt(r.rev)
      const out = (r, key) => ({ [key]: r[key], data: r.data, updatedAt: r.updated_at.toISOString(), deleted: r.deleted })
      return {
        cursor: max.toString(),
        serverTime: new Date().toISOString(),
        profile: prof[0] ? { data: prof[0].data, updatedAt: prof[0].updated_at.toISOString() } : null,
        episodes: eps.map((r) => out(r, 'id')),
        shortcuts: shs.map((r) => out(r, 'id')),
        feelings: fls.map((r) => out(r, 'day')),
      }
    })
  })

  // ---- RGPD ----
  // Export complet des données du compte (portabilité, art. 20)
  app.get('/api/account/export', async (req, reply) => {
    await requireUser(req)
    const id = req.user.id
    const rows = (sql) => pool.query(sql, [id]).then((r) => r.rows)
    const [prof, eps, shs, fls] = await Promise.all([
      rows('SELECT data FROM profiles WHERE user_id = $1'),
      rows('SELECT data FROM episodes WHERE user_id = $1 AND NOT deleted ORDER BY occurred_at'),
      rows('SELECT data FROM shortcuts WHERE user_id = $1 AND NOT deleted'),
      rows('SELECT day, data FROM feelings WHERE user_id = $1 AND NOT deleted ORDER BY day'),
    ])
    reply.header('Content-Disposition', `attachment; filename="pousse-export-${new Date().toISOString().slice(0, 10)}.json"`)
    return {
      format: 'pousse-export', version: 2, exportedAt: new Date().toISOString(),
      account: { ...publicUser(req.user), healthConsentVersion: req.user.health_consent_version || null, ageConfirmedAt: req.user.age_confirmed_at || null },
      profile: prof[0]?.data || null,
      episodes: eps.map((r) => r.data),
      shortcuts: shs.map((r) => r.data),
      feelings: fls.map((r) => ({ day: r.day, ...r.data })),
    }
  })

  // Suppression définitive du compte et de toutes ses données (effacement, art. 17)
  app.delete('/api/account', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['password'], additionalProperties: false,
      properties: { password: { type: 'string', maxLength: 200 } } } },
  }, async (req, reply) => {
    await requireUser(req)
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (!(await verifyPassword(req.body.password, rows[0].password_hash))) throw new HttpError(401, 'Mot de passe incorrect')
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id])
    reply.clearCookie(COOKIE, { path: '/' })
    return { ok: true }
  })

  // ---- Rappel du soir (notifications push) ----
  // Clé publique VAPID : null si le serveur n'est pas configuré pour le push
  app.get('/api/push/key', async () => ({ publicKey: push?.publicKey || null }))

  const TIME = { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }
  const ENDPOINT = { type: 'string', minLength: 10, maxLength: 1000 }
  app.post('/api/push/subscription', {
    schema: { body: { type: 'object', required: ['subscription', 'time', 'timezone'], additionalProperties: false, properties: {
      subscription: { type: 'object', required: ['endpoint', 'keys'], properties: {
        endpoint: ENDPOINT,
        keys: { type: 'object', required: ['p256dh', 'auth'], properties: {
          p256dh: { type: 'string', minLength: 20, maxLength: 200 }, auth: { type: 'string', minLength: 8, maxLength: 100 } } } } },
      time: TIME,
      timezone: { type: 'string', minLength: 1, maxLength: 64 },
    } } },
  }, async (req) => {
    await requireUser(req)
    if (!push) throw new HttpError(503, 'Les rappels ne sont pas disponibles sur ce serveur', 'push_unavailable')
    const { subscription: s, time, timezone } = req.body
    if (!isAllowedEndpoint(s.endpoint, pushHosts)) throw new HttpError(400, 'Service de notification non reconnu')
    if (!isValidTimeZone(timezone)) throw new HttpError(400, 'Fuseau horaire invalide')
    // Si l'heure est déjà passée aujourd'hui, le premier rappel sera pour demain
    // (un appareil qui vient de s'abonner à 22 h ne reçoit rien dans la foulée).
    await pool.query(`
      INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, reminder_time, timezone, last_sent_day)
      VALUES ($1, $2, $3, $4, $5::time, $6,
        CASE WHEN (now() AT TIME ZONE $6)::time >= $5::time THEN (now() AT TIME ZONE $6)::date END)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        reminder_time = EXCLUDED.reminder_time, timezone = EXCLUDED.timezone,
        last_sent_day = EXCLUDED.last_sent_day, updated_at = now()`,
      [s.endpoint, req.user.id, s.keys.p256dh, s.keys.auth, time, timezone])
    return { ok: true }
  })

  app.delete('/api/push/subscription', {
    schema: { body: { type: 'object', required: ['endpoint'], additionalProperties: false, properties: { endpoint: ENDPOINT } } },
  }, async (req) => {
    await requireUser(req)
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [req.body.endpoint, req.user.id])
    return { ok: true }
  })

  // « Essayer » : envoie tout de suite un rappel à cet appareil
  app.post('/api/push/test', {
    ...authLimit,
    schema: { body: { type: 'object', required: ['endpoint'], additionalProperties: false, properties: { endpoint: ENDPOINT } } },
  }, async (req) => {
    await requireUser(req)
    if (!push) throw new HttpError(503, 'Les rappels ne sont pas disponibles sur ce serveur', 'push_unavailable')
    const { rows } = await pool.query('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [req.body.endpoint, req.user.id])
    if (!rows.length) throw new HttpError(404, 'Rappel non activé sur cet appareil')
    try {
      await push.send(rows[0], reminderPayload())
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [req.body.endpoint])
        throw new HttpError(410, 'Cet appareil n\u2019accepte plus les notifications. Réactive le rappel.', 'push_expired')
      }
      req.log.error({ err: e.message, status: e.statusCode }, 'rappel d\u2019essai non envoyé')
      throw new HttpError(502, 'Le service de notification n\u2019a pas répondu. Réessaie dans un instant.')
    }
    return { ok: true }
  })

  app.get('/api/health', async () => {
    await pool.query('SELECT 1')
    return { ok: true }
  })

  // ---- Application compilée (facultatif : un seul serveur pour l'app et l'API) ----
  if (config.staticDir) {
    const root = path.resolve(config.staticDir)
    await app.register(fastifyStatic, { root, wildcard: false })
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html')
      reply.code(404).send({ error: 'Introuvable' })
    })
  }

  return app
}

// Nettoyage périodique des sessions expirées
export function startSessionCleanup(pool, log) {
  const t = setInterval(() => {
    pool.query('DELETE FROM sessions WHERE expires_at < now()').catch((e) => log.error(e))
  }, 60 * 60 * 1000)
  t.unref()
  return t
}
