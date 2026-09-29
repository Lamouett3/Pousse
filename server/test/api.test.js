// Tests de l'API contre une vraie base PostgreSQL.
// Base utilisée : TEST_DATABASE_URL (défaut : pousse_test en local). Elle est VIDÉE à chaque lancement.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createPool } from '../src/db.js'
import { migrate } from '../src/migrate.js'
import { runReminders, isAllowedEndpoint, REMINDER_MESSAGES } from '../src/reminders.js'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const url = process.env.TEST_DATABASE_URL || 'postgres://pousse:pousse-dev@localhost:5432/pousse_test'
const pool = createPool(url)
let app
const sent = []   // e-mails capturés
const mailer = { async send(m) { sent.push(m) } }

before(async () => {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  await migrate(pool, () => {})
  app = await buildApp({ pool, config: { cookieSecure: false, sessionDays: 30, appOrigin: '', staticDir: '', authMaxPerMinute: 1000, appUrl: 'https://pousse.test' }, logger: false, mailer })
})
after(async () => { await app.close(); await pool.end() })

const H = { 'x-pousse-client': '1' }
// Cases cochées à l'inscription (consentement données de santé + âge minimum)
const OK = { healthConsent: true, ageConfirmed: true }
// Un « appareil » = un jar de cookie
function device() {
  let cookie = ''
  return {
    async req(method, url, payload) {
      const res = await app.inject({ method, url, payload, headers: { ...H, ...(cookie ? { cookie } : {}) } })
      const set = res.headers['set-cookie']
      if (set) cookie = String(Array.isArray(set) ? set[0] : set).split(';')[0]
      return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null, headers: res.headers }
    },
  }
}
const ep = (id, over = {}) => ({ id, createdAt: '2026-09-20T09:00:00.000Z', condition: 'migraine', intensity: 6, zones: ['tempeG'], treatment: 'Triptan', ...over })

test('inscription : cookie de session sécurisé, nom unique, mot de passe de 8 caractères minimum', async () => {
  const a = device()
  const r = await a.req('POST', '/api/auth/register', { name: 'Camille', password: 'jardin-secret', email: 'camille@exemple.fr', ...OK })
  assert.equal(r.status, 201)
  assert.equal(r.body.user.name, 'Camille')
  assert.match(String(r.headers['set-cookie']), /HttpOnly/i)
  assert.match(String(r.headers['set-cookie']), /SameSite=Lax/i)
  assert.equal((await device().req('POST', '/api/auth/register', { name: 'camille', password: 'autre-secret', email: 'autre@exemple.fr', ...OK })).status, 409)
  assert.equal((await device().req('POST', '/api/auth/register', { name: 'Court', password: '1234567', email: 'court@exemple.fr', ...OK })).status, 400)
  const stored = await pool.query("SELECT password_hash FROM users WHERE name_key = 'camille'")
  assert.match(stored.rows[0].password_hash, /^scrypt\$/)
  assert.ok(!stored.rows[0].password_hash.includes('jardin-secret'))
})

test('connexion : refus si mauvais mot de passe ou compte inconnu, même message', async () => {
  const bad = await device().req('POST', '/api/auth/login', { name: 'Camille', password: 'faux-mot-de-passe' })
  const unknown = await device().req('POST', '/api/auth/login', { name: 'Personne', password: 'faux-mot-de-passe' })
  assert.equal(bad.status, 401)
  assert.equal(unknown.status, 401)
  assert.equal(bad.body.error, unknown.body.error)
  const ok = await device().req('POST', '/api/auth/login', { name: 'CAMILLE', password: 'jardin-secret' })
  assert.equal(ok.status, 200)
})

test('protection : sans session → 401, sans en-tête anti-CSRF → 403', async () => {
  assert.equal((await device().req('POST', '/api/sync', {})).status, 401)
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { name: 'Camille', password: 'jardin-secret' } })
  assert.equal(res.statusCode, 403)
})

test('synchronisation entre deux appareils du même compte', async () => {
  const phone = device(), laptop = device()
  await phone.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  await laptop.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  const now = new Date().toISOString()
  const push = await phone.req('POST', '/api/sync', {
    cursor: '0',
    changes: {
      profile: { data: { gender: 'f', cycleOn: true, moonOn: false }, updatedAt: now },
      episodes: [{ id: 'e1', data: ep('e1'), updatedAt: now }, { id: 'e2', data: ep('e2', { intensity: 3 }), updatedAt: now }],
      shortcuts: [{ id: 's1', data: { id: 's1', label: 'Migraine habituelle' }, updatedAt: now }],
      feelings: [{ day: '2026-09-20', data: { mood: 'fatigue', energy: 'basse', symptoms: ['maux_tete'] }, updatedAt: now }],
    },
  })
  assert.equal(push.status, 200)
  const pull = await laptop.req('POST', '/api/sync', { cursor: '0' })
  assert.equal(pull.body.episodes.length, 2)
  assert.equal(pull.body.shortcuts.length, 1)
  assert.deepEqual(pull.body.feelings[0], { day: '2026-09-20', data: { mood: 'fatigue', energy: 'basse', symptoms: ['maux_tete'] }, updatedAt: now, deleted: false })
  assert.equal(pull.body.profile.data.gender, 'f')
  // Avec le curseur reçu, rien de nouveau
  const again = await laptop.req('POST', '/api/sync', { cursor: pull.body.cursor })
  assert.equal(again.body.episodes.length + again.body.feelings.length + again.body.shortcuts.length, 0)
  assert.equal(again.body.profile, null)
  // Colonnes indexées renseignées
  const row = await pool.query("SELECT condition, intensity, occurred_at FROM episodes WHERE id = 'e2'")
  assert.equal(row.rows[0].condition, 'migraine')
  assert.equal(row.rows[0].intensity, 3)
})

test('conflits : la modification la plus récente l\'emporte, les suppressions se propagent', async () => {
  const a = device(), b = device()
  await a.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  await b.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  const start = (await b.req('POST', '/api/sync', { cursor: '0' })).body.cursor
  const t0 = new Date(Date.now() + 3600e3).toISOString(), t1 = new Date(Date.now() + 7200e3).toISOString()
  await a.req('POST', '/api/sync', { changes: { episodes: [{ id: 'e1', data: ep('e1', { intensity: 9 }), updatedAt: t1 }] } })
  // b envoie une version plus ancienne : ignorée
  await b.req('POST', '/api/sync', { changes: { episodes: [{ id: 'e1', data: ep('e1', { intensity: 2 }), updatedAt: t0 }] } })
  const r = await pool.query("SELECT intensity FROM episodes WHERE id = 'e1'")
  assert.equal(r.rows[0].intensity, 9)
  // suppression par a, visible par b
  await a.req('POST', '/api/sync', { changes: { episodes: [{ id: 'e2', deleted: true, updatedAt: new Date().toISOString() }] } })
  const pull = await b.req('POST', '/api/sync', { cursor: start })
  const e2 = pull.body.episodes.find((e) => e.id === 'e2')
  assert.equal(e2.deleted, true)
  assert.equal(pull.body.episodes.find((e) => e.id === 'e1').data.intensity, 9)
})

test('isolation : un compte ne voit ni ne modifie les données d\'un autre', async () => {
  const other = device()
  await other.req('POST', '/api/auth/register', { name: 'Intrus', password: 'autre-secret', email: 'intrus@exemple.fr', ...OK })
  const pull = await other.req('POST', '/api/sync', { cursor: '0' })
  assert.equal(pull.body.episodes.length, 0)
  assert.equal(pull.body.profile, null)
  // Même identifiant d'épisode : enregistrement distinct, celui de Camille intact
  await other.req('POST', '/api/sync', { changes: { episodes: [{ id: 'e1', data: ep('e1', { intensity: 1 }), updatedAt: '2030-01-01T00:00:00.000Z' }] } })
  const r = await pool.query("SELECT u.name, e.intensity FROM episodes e JOIN users u ON u.id = e.user_id WHERE e.id = 'e1' ORDER BY u.name")
  assert.deepEqual(r.rows.map((x) => [x.name, x.intensity]), [['Camille', 9], ['Intrus', 1]])
})

test('validation : données invalides ou trop volumineuses refusées', async () => {
  const a = device()
  await a.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  assert.equal((await a.req('POST', '/api/sync', { changes: { episodes: [{ id: 'x', updatedAt: 'pas une date' }] } })).status, 400)
  assert.equal((await a.req('POST', '/api/sync', { changes: { feelings: [{ day: '20/09/2026', updatedAt: new Date().toISOString() }] } })).status, 400)
  assert.equal((await a.req('POST', '/api/sync', { cursor: "1; DROP TABLE users" })).status, 400)
  const big = { id: 'big', note: 'x'.repeat(30000) }
  assert.equal((await a.req('POST', '/api/sync', { changes: { episodes: [{ id: 'big', data: big, updatedAt: new Date().toISOString() }] } })).status, 413)
  assert.equal((await pool.query("SELECT count(*)::int n FROM episodes WHERE id = 'big'")).rows[0].n, 0)
})

test('export RGPD : toutes les données du compte, sans les éléments supprimés', async () => {
  const a = device()
  await a.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  const r = await a.req('GET', '/api/account/export')
  assert.equal(r.status, 200)
  assert.match(r.headers['content-disposition'], /attachment/)
  assert.deepEqual(r.body.episodes.map((e) => e.id), ['e1'])
  assert.equal(r.body.feelings[0].mood, 'fatigue')
  assert.equal(r.body.shortcuts.length, 1)
})

test('changement de mot de passe : déconnecte les autres appareils', async () => {
  const a = device(), b = device()
  await a.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  await b.req('POST', '/api/auth/login', { name: 'Camille', password: 'jardin-secret' })
  assert.equal((await a.req('POST', '/api/auth/password', { currentPassword: 'mauvais', newPassword: 'nouveau-secret' })).status, 401)
  assert.equal((await a.req('POST', '/api/auth/password', { currentPassword: 'jardin-secret', newPassword: 'nouveau-secret' })).status, 200)
  assert.equal((await b.req('GET', '/api/auth/me')).status, 401)
  assert.equal((await a.req('GET', '/api/auth/me')).status, 200)
})

test('suppression du compte : mot de passe exigé, toutes les données effacées', async () => {
  const a = device()
  await a.req('POST', '/api/auth/login', { name: 'Camille', password: 'nouveau-secret' })
  const id = (await a.req('GET', '/api/auth/me')).body.user.id
  assert.equal((await a.req('DELETE', '/api/account', { password: 'mauvais' })).status, 401)
  assert.equal((await a.req('DELETE', '/api/account', { password: 'nouveau-secret' })).status, 200)
  for (const t of ['episodes', 'feelings', 'shortcuts', 'profiles', 'sessions']) {
    const n = (await pool.query(`SELECT count(*)::int n FROM ${t} WHERE user_id = $1`, [id])).rows[0].n
    assert.equal(n, 0, t)
  }
  assert.equal((await a.req('GET', '/api/auth/me')).status, 401)
})

test('déconnexion : la session est révoquée côté serveur', async () => {
  const a = device()
  await a.req('POST', '/api/auth/login', { name: 'Intrus', password: 'autre-secret', email: 'intrus@exemple.fr' })
  assert.equal((await a.req('POST', '/api/auth/logout')).status, 200)
  assert.equal((await a.req('GET', '/api/auth/me')).status, 401)
})

test('limitation : trop de tentatives de connexion → 429', async () => {
  const limited = await buildApp({ pool, config: { cookieSecure: false, sessionDays: 30, appOrigin: '', staticDir: '', authMaxPerMinute: 3 }, logger: false })
  const codes = []
  for (let i = 0; i < 5; i++) {
    const r = await limited.inject({ method: 'POST', url: '/api/auth/login', headers: H, payload: { name: 'Intrus', password: 'essai-' + i } })
    codes.push(r.statusCode)
  }
  await limited.close()
  assert.deepEqual(codes, [401, 401, 401, 429, 429])
})

test('e-mail : obligatoire, valide et unique à l\'inscription ; connexion par e-mail', async () => {
  assert.equal((await device().req('POST', '/api/auth/register', { name: 'SansMail', password: 'secret-long', ...OK })).status, 400)
  assert.equal((await device().req('POST', '/api/auth/register', { name: 'MauvaisMail', password: 'secret-long', email: 'pas-un-mail', ...OK })).status, 400)
  const a = device()
  assert.equal((await a.req('POST', '/api/auth/register', { name: 'Lou', password: 'secret-de-lou', email: 'Lou@Exemple.fr', ...OK })).status, 201)
  const dup = await device().req('POST', '/api/auth/register', { name: 'Lou2', password: 'secret-de-lou', email: 'lou@exemple.fr', ...OK })
  assert.equal(dup.status, 409); assert.match(dup.body.error, /e-mail/)
  const byMail = await device().req('POST', '/api/auth/login', { name: 'LOU@exemple.fr', password: 'secret-de-lou' })
  assert.equal(byMail.status, 200); assert.equal(byMail.body.user.email, 'Lou@Exemple.fr')
})

test('mot de passe oublié : lien par e-mail, usage unique, sessions révoquées, pas d\'énumération', async () => {
  const old = device()
  await old.req('POST', '/api/auth/login', { name: 'Lou', password: 'secret-de-lou' })
  sent.length = 0
  const unknown = await device().req('POST', '/api/auth/forgot', { email: 'personne@exemple.fr' })
  const known = await device().req('POST', '/api/auth/forgot', { email: 'LOU@exemple.fr' })
  assert.equal(unknown.status, 200); assert.equal(known.status, 200)
  assert.deepEqual(unknown.body, known.body)
  await new Promise((r) => setTimeout(r, 50))
  assert.equal(sent.length, 1, 'un seul e-mail (adresse connue)')
  assert.equal(sent[0].to, 'Lou@Exemple.fr')
  assert.match(sent[0].text, /https:\/\/pousse\.test\/\?reset=/)
  const token = decodeURIComponent(sent[0].text.match(/reset=(\S+)/)[1])
  const stored = await pool.query('SELECT token_hash FROM password_resets')
  assert.ok(stored.rows.every((r) => r.token_hash !== token), 'le jeton brut n\'est jamais stocké')
  assert.equal((await device().req('POST', '/api/auth/reset', { token, password: 'court' })).status, 400)
  assert.equal((await device().req('POST', '/api/auth/reset', { token, password: 'nouveau-secret-lou' })).status, 200)
  assert.equal((await device().req('POST', '/api/auth/reset', { token, password: 'encore-un-autre' })).status, 400, 'lien à usage unique')
  assert.equal((await old.req('GET', '/api/auth/me')).status, 401, 'anciennes sessions révoquées')
  assert.equal((await device().req('POST', '/api/auth/login', { name: 'Lou', password: 'secret-de-lou' })).status, 401)
  assert.equal((await device().req('POST', '/api/auth/login', { name: 'Lou', password: 'nouveau-secret-lou' })).status, 200)
  assert.equal((await device().req('POST', '/api/auth/reset', { token: 'x'.repeat(40), password: 'nouveau-secret' })).status, 400)
})

test('lien de réinitialisation expiré refusé', async () => {
  sent.length = 0
  await device().req('POST', '/api/auth/forgot', { email: 'lou@exemple.fr' })
  await new Promise((r) => setTimeout(r, 50))
  const token = decodeURIComponent(sent[0].text.match(/reset=(\S+)/)[1])
  await pool.query("UPDATE password_resets SET expires_at = now() - interval '1 minute'")
  assert.equal((await device().req('POST', '/api/auth/reset', { token, password: 'encore-nouveau' })).status, 400)
})

test('modifier son adresse e-mail : mot de passe exigé, unicité', async () => {
  const a = device()
  await a.req('POST', '/api/auth/login', { name: 'Lou', password: 'nouveau-secret-lou' })
  assert.equal((await a.req('POST', '/api/account/email', { email: 'lou.nouvelle@exemple.fr', password: 'faux' })).status, 401)
  assert.equal((await a.req('POST', '/api/account/email', { email: 'intrus@exemple.fr', password: 'nouveau-secret-lou' })).status, 409)
  const ok = await a.req('POST', '/api/account/email', { email: 'lou.nouvelle@exemple.fr', password: 'nouveau-secret-lou' })
  assert.equal(ok.status, 200); assert.equal(ok.body.user.email, 'lou.nouvelle@exemple.fr')
  assert.equal((await a.req('GET', '/api/auth/me')).body.user.email, 'lou.nouvelle@exemple.fr')
})

test('en-têtes : Cache-Control no-store sur toute l\'API, y compris les erreurs', async () => {
  const a = device()
  await a.req('POST', '/api/auth/register', { name: 'Cache', password: 'secret-cache', email: 'cache@exemple.fr', ...OK })
  for (const [m, u, body] of [['GET', '/api/auth/me'], ['POST', '/api/sync', {}], ['GET', '/api/account/export'], ['GET', '/api/health']]) {
    const r = await a.req(m, u, body)
    assert.equal(r.status, 200, u)
    assert.equal(r.headers['cache-control'], 'no-store', u)
  }
  const unauth = await device().req('GET', '/api/auth/me')
  assert.equal(unauth.status, 401)
  assert.equal(unauth.headers['cache-control'], 'no-store')
})

test('en-têtes : Content-Security-Policy stricte (aucun script inline ni externe)', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/health' })
  const csp = res.headers['content-security-policy']
  assert.ok(csp, 'CSP présente')
  assert.match(csp, /script-src 'self'(;|$)/)
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /connect-src 'self' https:\/\/api\.open-meteo\.com/)
  assert.doesNotMatch(csp, /upgrade-insecure-requests/)   // cookieSecure: false dans les tests
})

test('consentement : obligatoire à l\'inscription, horodaté par le serveur, versionné', async () => {
  const base = { name: 'Nina', password: 'secret-de-nina', email: 'nina@exemple.fr' }
  const sans = await device().req('POST', '/api/auth/register', base)
  assert.equal(sans.status, 400)
  assert.equal(sans.body.code, 'consent_required')
  const sansAge = await device().req('POST', '/api/auth/register', { ...base, healthConsent: true, ageConfirmed: false })
  assert.equal(sansAge.status, 400)
  assert.equal(sansAge.body.code, 'age_required')
  const faux = await device().req('POST', '/api/auth/register', { ...base, healthConsent: 'oui', ageConfirmed: true })
  assert.equal(faux.status, 400)   // un booléen strict est exigé
  assert.equal((await pool.query("SELECT count(*)::int n FROM users WHERE name_key = 'nina'")).rows[0].n, 0)

  const a = device()
  const t0 = Date.now()
  const r = await a.req('POST', '/api/auth/register', { ...base, ...OK })
  assert.equal(r.status, 201)
  assert.equal(r.body.user.consentRequired, false)
  const { rows } = await pool.query("SELECT health_consent_at, health_consent_version, age_confirmed_at FROM users WHERE name_key = 'nina'")
  assert.ok(rows[0].health_consent_at.getTime() >= t0 - 5000)
  assert.ok(rows[0].age_confirmed_at)
  assert.match(rows[0].health_consent_version, /^\d{4}-\d{2}-\d{2}$/)
  const exp = await a.req('GET', '/api/account/export')
  assert.ok(exp.body.account.healthConsentAt)
  assert.equal(exp.body.account.healthConsentVersion, rows[0].health_consent_version)
})

test('consentement : un compte sans accord (créé avant v11) ne synchronise plus tant qu\'il n\'a pas accepté', async () => {
  const a = device()
  await a.req('POST', '/api/auth/register', { name: 'Ancien', password: 'secret-ancien', email: 'ancien@exemple.fr', ...OK })
  await a.req('POST', '/api/sync', { changes: { episodes: [{ id: 'old-1', data: ep('old-1'), updatedAt: '2026-09-20T09:00:00.000Z' }] } })
  // Simule un compte antérieur à la migration 003
  await pool.query("UPDATE users SET health_consent_at = NULL, health_consent_version = NULL, age_confirmed_at = NULL WHERE name_key = 'ancien'")

  const b = device()
  const login = await b.req('POST', '/api/auth/login', { name: 'Ancien', password: 'secret-ancien' })
  assert.equal(login.status, 200)
  assert.equal(login.body.user.consentRequired, true)
  assert.equal((await b.req('GET', '/api/auth/me')).body.user.consentRequired, true)
  const blocked = await b.req('POST', '/api/sync', {})
  assert.equal(blocked.status, 403)
  assert.equal(blocked.body.code, 'consent_required')
  assert.equal(blocked.body.episodes, undefined)   // aucune donnée renvoyée

  assert.equal((await b.req('POST', '/api/account/consent', { healthConsent: true, ageConfirmed: false })).status, 400)
  assert.equal((await device().req('POST', '/api/account/consent', OK)).status, 401)
  const ok = await b.req('POST', '/api/account/consent', OK)
  assert.equal(ok.status, 200)
  assert.equal(ok.body.user.consentRequired, false)
  const sync = await b.req('POST', '/api/sync', {})
  assert.equal(sync.status, 200)
  assert.ok(sync.body.episodes.some((e) => e.id === 'old-1'))

  // Nouvelle version du texte : les accords antérieurs ne suffisent plus
  await pool.query("UPDATE users SET health_consent_version = '2000-01-01' WHERE name_key = 'ancien'")
  assert.equal((await b.req('POST', '/api/sync', {})).status, 403)
})

test('application servie (@fastify/static 10) : fichiers, repli sur index.html, traversée de répertoire impossible', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'pousse-static-'))
  await mkdir(path.join(dir, 'assets'))
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>Pousse</title>')
  await writeFile(path.join(dir, 'assets', 'app.js'), 'console.info(1)')
  const web = await buildApp({ pool, config: { cookieSecure: true, sessionDays: 30, appOrigin: '', staticDir: dir, authMaxPerMinute: 1000, appUrl: 'https://pousse.test' }, logger: false, mailer })
  try {
    const js = await web.inject({ method: 'GET', url: '/assets/app.js' })
    assert.equal(js.statusCode, 200)
    assert.equal(js.body, 'console.info(1)')
    const page = await web.inject({ method: 'GET', url: '/historique' })
    assert.equal(page.statusCode, 200)
    assert.match(page.body, /<title>Pousse<\/title>/)
    assert.match(page.headers['content-security-policy'], /script-src 'self'/)
    assert.match(page.headers['content-security-policy'], /upgrade-insecure-requests/)   // HTTPS en production
    for (const url of ['/..%2f..%2fpackage.json', '/%2e%2e/src/server.js', '/assets/..%2f..%2f..%2fetc%2fpasswd', '/assets/%2e%2e%2f%2e%2e%2fpackage.json']) {
      const r = await web.inject({ method: 'GET', url })
      assert.ok(!r.body.includes('"dependencies"') && !r.body.includes('root:'), url)
    }
    const api404 = await web.inject({ method: 'GET', url: '/api/inconnu' })
    assert.equal(api404.statusCode, 404)
    assert.equal(api404.headers['cache-control'], 'no-store')
  } finally { await web.close() }
})

// ---- Rappel du soir ----
const pushed = []   // notifications « envoyées » par le faux service de push
const gone = new Set()   // abonnements que le service déclare expirés (410)
const fakePusher = {
  publicKey: 'BFakeVapidPublicKey',
  async send(sub, payload) {
    if (gone.has(sub.endpoint)) { const e = new Error('Gone'); e.statusCode = 410; throw e }
    pushed.push({ endpoint: sub.endpoint, payload })
    return { statusCode: 201 }
  },
}
const sub = (id) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { p256dh: 'B' + 'x'.repeat(86), auth: 'a'.repeat(22) } })

test('rappel : indisponible sans clés VAPID, clé publique fournie sinon', async () => {
  const a = device()
  await a.req('POST', '/api/auth/register', { name: 'SansPush', password: 'secret-sans-push', email: 'sanspush@exemple.fr', ...OK })
  assert.deepEqual((await a.req('GET', '/api/push/key')).body, { publicKey: null })
  const r = await a.req('POST', '/api/push/subscription', { subscription: sub('x1'), time: '20:30', timezone: 'Europe/Paris' })
  assert.equal(r.status, 503)
  assert.equal(r.body.code, 'push_unavailable')
})

test('rappel : abonnement validé (service de push connu, heure, fuseau), propre au compte', async () => {
  const web = await buildApp({ pool, config: { cookieSecure: false, sessionDays: 30, appOrigin: '', staticDir: '', authMaxPerMinute: 1000, appUrl: 'https://pousse.test' }, logger: false, mailer, pusher: fakePusher })
  try {
    let cookie = ''
    const req = async (method, url, payload) => {
      const res = await web.inject({ method, url, payload, headers: { ...H, ...(cookie ? { cookie } : {}) } })
      const set = res.headers['set-cookie']; if (set) cookie = String(Array.isArray(set) ? set[0] : set).split(';')[0]
      return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
    }
    assert.equal((await req('POST', '/api/push/subscription', { subscription: sub('a1'), time: '20:30', timezone: 'Europe/Paris' })).status, 401)
    await req('POST', '/api/auth/register', { name: 'Iris', password: 'secret-iris', email: 'iris@exemple.fr', ...OK })
    assert.equal((await req('GET', '/api/push/key')).body.publicKey, 'BFakeVapidPublicKey')
    const bad = [
      [{ ...sub('a1'), endpoint: 'http://fcm.googleapis.com/fcm/send/a1' }, '20:30', 'Europe/Paris'],   // pas HTTPS
      [{ ...sub('a1'), endpoint: 'https://127.0.0.1/admin' }, '20:30', 'Europe/Paris'],                // adresse interne
      [{ ...sub('a1'), endpoint: 'https://fcm.googleapis.com.pirate.example/x' }, '20:30', 'Europe/Paris'],
      [{ ...sub('a1'), endpoint: 'https://push.apple.com.pirate.example/x' }, '20:30', 'Europe/Paris'],
      [sub('a1'), '24:00', 'Europe/Paris'],
      [sub('a1'), '8h30', 'Europe/Paris'],
      [sub('a1'), '20:30', 'Mars/Olympus'],
    ]
    for (const [subscription, time, timezone] of bad) {
      assert.equal((await req('POST', '/api/push/subscription', { subscription, time, timezone })).status, 400, JSON.stringify([subscription.endpoint, time, timezone]))
    }
    assert.ok(isAllowedEndpoint('https://web.push.apple.com/QGx'))
    assert.ok(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'))
    assert.ok(!isAllowedEndpoint('https://push.apple.com.evil/x'))
    assert.equal((await req('POST', '/api/push/subscription', { subscription: sub('a1'), time: '20:30', timezone: 'Europe/Paris' })).status, 200)
    assert.equal((await req('POST', '/api/push/subscription', { subscription: sub('a1'), time: '21:15', timezone: 'Europe/Paris' })).status, 200) // mise à jour
    const row = (await pool.query("SELECT reminder_time::text t FROM push_subscriptions WHERE endpoint LIKE '%/a1'")).rows
    assert.deepEqual(row, [{ t: '21:15:00' }])
    // « Essayer » : seulement pour un abonnement de ce compte
    assert.equal((await req('POST', '/api/push/test', { endpoint: sub('inconnu').endpoint })).status, 404)
    pushed.length = 0
    assert.equal((await req('POST', '/api/push/test', { endpoint: sub('a1').endpoint })).status, 200)
    assert.equal(pushed.length, 1)
    // Désactivation
    assert.equal((await req('DELETE', '/api/push/subscription', { endpoint: sub('a1').endpoint })).status, 200)
    assert.equal((await pool.query("SELECT count(*)::int n FROM push_subscriptions WHERE endpoint LIKE '%/a1'")).rows[0].n, 0)
    // Toutes les réponses restent en no-store
    const res = await web.inject({ method: 'GET', url: '/api/push/key' })
    assert.equal(res.headers['cache-control'], 'no-store')
  } finally { await web.close() }
})

test('rappel : envoyé à l\'heure locale, une fois par jour, pas si le ressenti est noté, jamais trop tard', async () => {
  const a = device()
  await a.req('POST', '/api/auth/register', { name: 'Rose', password: 'secret-rose', email: 'rose@exemple.fr', ...OK })
  const uid = (await pool.query("SELECT id FROM users WHERE name_key = 'rose'")).rows[0].id
  // Abonnements écrits directement (le planificateur est testé seul, avec une horloge simulée)
  await pool.query('DELETE FROM push_subscriptions')
  const ins = (id, time, tz) => pool.query('INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, reminder_time, timezone) VALUES ($1,$2,$3,$4,$5,$6)',
    [sub(id).endpoint, uid, sub(id).keys.p256dh, sub(id).keys.auth, time, tz])
  await ins('paris', '20:30', 'Europe/Paris')          // UTC+2 en septembre
  await ins('ny', '20:30', 'America/New_York')         // UTC-4
  pushed.length = 0
  const run = (iso) => runReminders(pool, fakePusher, { error() {} }, new Date(iso))

  assert.deepEqual(await run('2030-09-20T18:29:00Z'), { sent: 0, skipped: 0, removed: 0 })   // 20 h 29 à Paris
  assert.deepEqual(await run('2030-09-20T18:31:00Z'), { sent: 1, skipped: 0, removed: 0 })   // 20 h 31 : Paris
  assert.equal(pushed[0].endpoint, sub('paris').endpoint)
  assert.deepEqual(await run('2030-09-20T19:10:00Z'), { sent: 0, skipped: 0, removed: 0 })   // déjà fait aujourd'hui
  assert.deepEqual(await run('2030-09-21T00:35:00Z'), { sent: 1, skipped: 0, removed: 0 })   // 20 h 35 à New York
  // Contenu générique : aucun champ de données de santé
  const p = pushed[0].payload
  assert.deepEqual(Object.keys(p).sort(), ['body', 'tag', 'title', 'url'])
  assert.ok(REMINDER_MESSAGES.some((m) => m.title === p.title && m.body === p.body))
  assert.equal(p.url, '/?ecoute=1')

  // Lendemain : le ressenti du 21 est déjà noté (synchronisé) → pas de rappel, mais la journée est traitée
  await a.req('POST', '/api/sync', { changes: { feelings: [{ day: '2030-09-21', data: { mood: 'bien' }, updatedAt: '2030-09-21T10:00:00.000Z' }] } })
  assert.deepEqual(await run('2030-09-21T18:45:00Z'), { sent: 0, skipped: 1, removed: 0 })
  assert.deepEqual(await run('2030-09-21T19:45:00Z'), { sent: 0, skipped: 0, removed: 0 })

  // Serveur arrêté toute la soirée : pas de rappel plus de 2 h après l'heure choisie
  assert.deepEqual(await run('2030-09-22T20:40:00Z'), { sent: 0, skipped: 0, removed: 0 })   // 22 h 40 Paris : trop tard
  // (New York le 22 : 16 h 40, pas encore l'heure)

  // Abonnement révoqué par le navigateur (410) : supprimé
  gone.add(sub('paris').endpoint)
  assert.deepEqual(await run('2030-09-23T18:31:00Z'), { sent: 0, skipped: 0, removed: 1 })
  assert.equal((await pool.query('SELECT count(*)::int n FROM push_subscriptions WHERE endpoint = $1', [sub('paris').endpoint])).rows[0].n, 0)

  // Suppression du compte : ses abonnements disparaissent avec lui
  assert.equal((await a.req('DELETE', '/api/account', { password: 'secret-rose' })).status, 200)
  assert.equal((await pool.query('SELECT count(*)::int n FROM push_subscriptions WHERE user_id = $1', [uid])).rows[0].n, 0)
})

test('rappel : deux passages simultanés (deux instances de l\'API) n\'envoient qu\'une fois', async () => {
  const a = device()
  await a.req('POST', '/api/auth/register', { name: 'Double', password: 'secret-double', email: 'double@exemple.fr', ...OK })
  const uid = (await pool.query("SELECT id FROM users WHERE name_key = 'double'")).rows[0].id
  await pool.query('DELETE FROM push_subscriptions')
  await pool.query('INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, reminder_time, timezone) VALUES ($1,$2,$3,$4,$5,$6)',
    [sub('dbl').endpoint, uid, sub('dbl').keys.p256dh, sub('dbl').keys.auth, '09:00', 'UTC'])
  pushed.length = 0
  const now = new Date('2031-01-05T09:05:00Z')
  const [r1, r2] = await Promise.all([runReminders(pool, fakePusher, {}, now), runReminders(pool, fakePusher, {}, now)])
  assert.equal(r1.sent + r2.sent, 1)
  assert.equal(pushed.length, 1)
})
