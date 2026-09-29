import { isRemoteMode, api } from './remote'
// =============================================================
// Gestion des comptes et sessions — localStorage
// Chaque compte a ses propres données (episodes, profil)
// namespacees par accountId.
// =============================================================

const ACCOUNTS_KEY = 'pousse.accounts'
const SESSION_KEY = 'pousse.session'

// ---- Comptes ----

export function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

// ---- Session ----

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setSession(accountId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accountId }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function currentAccountId() {
  const s = getSession()
  return s ? s.accountId : null
}

export function currentAccountName() {
  const id = currentAccountId()
  if (!id) return null
  const session = getSession()
  if (session?.name) return session.name
  const acc = loadAccounts().find((a) => a.id === id)
  return acc ? acc.name : null
}

// ---- Inscription / Connexion ----

// ---- Hachage des mots de passe (SHA-256 + sel par compte) ----
// Aucun mot de passe n'est stocké en clair. Les anciens comptes (champ
// `password`) sont migrés vers un hash à leur première connexion réussie.

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Mode en ligne : le compte est créé sur le serveur, la session est un cookie
// httpOnly ; on garde localement l'identifiant et le nom pour l'affichage.
function setRemoteSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accountId: user.id, name: user.name, remote: true, consentRequired: !!user.consentRequired }))
}

// Compte en ligne sans consentement valide (créé avant la v11 ou texte mis à jour)
export function setConsentRequired(required) {
  const s = getSession()
  if (!s?.remote) return
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, consentRequired: !!required }))
}

// consent = { healthConsent, ageConfirmed } : cases cochées à l'inscription
export async function register(name, password, email = '', consent = {}) {
  if (isRemoteMode()) {
    if (!name.trim()) return { ok: false, error: 'Choisis un nom' }
    if (name.includes('@')) return { ok: false, error: 'Le nom ne peut pas contenir « @ »' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return { ok: false, error: 'Indique une adresse e-mail valide : elle servira à récupérer ton compte' }
    if (password.length < 8) return { ok: false, error: 'Choisis un mot de passe d\u2019au moins 8 caractères' }
    try {
      const { user } = await api('POST', '/api/auth/register', {
        name: name.trim(), password, email: email.trim(),
        healthConsent: consent.healthConsent === true, ageConfirmed: consent.ageConfirmed === true,
      })
      setRemoteSession(user)
      return { ok: true, account: user }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Choisis un nom' }
  if (!password) return { ok: false, error: 'Choisis un mot de passe' }
  if (password.length < 4) return { ok: false, error: 'Choisis un mot de passe d\'au moins 4 caractères' }

  const accounts = loadAccounts()
  if (accounts.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'Ce nom est déjà pris' }
  }

  const salt = randomSalt()
  const passwordHash = await hashPassword(password, salt)
  const account = {
    id: crypto.randomUUID(),
    name: trimmed,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
    // Mode local : l'accord est conservé sur l'appareil avec le compte
    healthConsentAt: consent.healthConsent === true ? new Date().toISOString() : null,
    ageConfirmedAt: consent.ageConfirmed === true ? new Date().toISOString() : null,
  }
  accounts.push(account)
  saveAccounts(accounts)
  setSession(account.id)
  return { ok: true, account }
}

export async function login(name, password) {
  if (isRemoteMode()) {
    try {
      const { user } = await api('POST', '/api/auth/login', { name: name.trim(), password })
      setRemoteSession(user)
      return { ok: true, account: user }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }
  const trimmed = name.trim()
  const accounts = loadAccounts()
  const candidate = accounts.find((a) => a.name.toLowerCase() === trimmed.toLowerCase())
  if (!candidate) return { ok: false, error: 'Nom ou mot de passe incorrect' }

  let valid = false
  if (candidate.passwordHash) {
    valid = (await hashPassword(password, candidate.salt || '')) === candidate.passwordHash
  } else {
    // Compte créé avant le hachage : comparaison directe puis migration.
    valid = candidate.password === password
    if (valid) {
      const salt = randomSalt()
      candidate.salt = salt
      candidate.passwordHash = await hashPassword(password, salt)
      delete candidate.password
      saveAccounts(accounts)
    }
  }
  if (!valid) return { ok: false, error: 'Nom ou mot de passe incorrect' }
  setSession(candidate.id)
  return { ok: true, account: candidate }
}

export function logout() {
  if (getSession()?.remote) api('POST', '/api/auth/logout').catch(() => { /* hors ligne : le cookie expirera */ })
  clearSession()
}

// Vérifie le mot de passe d'un compte LOCAL de cet appareil, sans ouvrir de
// session (utilisé pour transférer ses données vers le compte en ligne).
export async function verifyLocalAccount(accountId, password) {
  const acc = loadAccounts().find((a) => a.id === accountId)
  if (!acc) return false
  if (acc.passwordHash) return (await hashPassword(password, acc.salt || '')) === acc.passwordHash
  return acc.password === password
}

// Comptes locaux de cet appareil ayant des données (pour le transfert en ligne)
export function localAccountsWithData() {
  return loadAccounts().map((a) => {
    let n = 0
    try { n = (JSON.parse(localStorage.getItem(`pousse.${a.id}.episodes.v1`) || '[]') || []).length } catch { /* rien */ }
    return { id: a.id, name: a.name, episodes: n }
  }).filter((a) => a.episodes > 0)
}

// ---- Migration des anciennes données ----

const OLD_EPISODES_KEY = 'pousse.episodes.v1'
const OLD_PROFILE_KEY = 'pousse.profile.v1'
const OLD_DEMO_KEY = 'pousse.demo.seeded'

/**
 * Si des données non-namespacees existent (avant le systeme de comptes),
 * les migre vers un compte "Mon compte" auto-cree.
 */
export function migrateIfNeeded() {
  const oldEpisodes = localStorage.getItem(OLD_EPISODES_KEY)
  const oldProfile = localStorage.getItem(OLD_PROFILE_KEY)
  if (!oldEpisodes && !oldProfile) return

  // Verifier qu'on n'a pas déjà migre
  const accounts = loadAccounts()
  if (accounts.length > 0) return

  const account = {
    id: crypto.randomUUID(),
    name: 'Mon compte',
    password: 'pousse',
    createdAt: new Date().toISOString(),
  }
  accounts.push(account)
  saveAccounts(accounts)
  setSession(account.id)

  // Copier les données vers le namespace du nouveau compte
  if (oldEpisodes) {
    localStorage.setItem(`pousse.${account.id}.episodes.v1`, oldEpisodes)
  }
  if (oldProfile) {
    localStorage.setItem(`pousse.${account.id}.profile.v1`, oldProfile)
  }

  // Nettoyer les anciennes cles
  localStorage.removeItem(OLD_EPISODES_KEY)
  localStorage.removeItem(OLD_PROFILE_KEY)
  localStorage.removeItem(OLD_DEMO_KEY)
}

// ---- Compte test Marie ----

const TEST_ID = 'test-marie'
const SEED_VERSION = 2 // incrementer pour forcer un re-seed

function dayKeyForSeed(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Cree le compte test "Marie" avec 6 jours d'épisodes
 * repartis sur les 7 derniers jours (jour 6/7 du cycle jardin).
 * Ne s'execute qu'une seule fois (si le compte n'existe pas déjà).
 */
export function seedTestAccount() {
  // Compte de démonstration local : inutile (et trompeur) en mode en ligne
  if (isRemoteMode()) return
  const accounts = loadAccounts()
  const versionKey = `pousse.${TEST_ID}.seed.v`
  const currentV = localStorage.getItem(versionKey)

  if (currentV === String(SEED_VERSION)) return

  // Supprimer l'ancien compte test si present
  const cleaned = accounts.filter((a) => a.id !== TEST_ID)
  const account = {
    id: TEST_ID,
    name: 'Marie',
    password: 'test',
    createdAt: new Date().toISOString(),
  }
  cleaned.push(account)
  saveAccounts(cleaned)

  const now = new Date()
  const gardenStart = new Date(now)
  gardenStart.setDate(gardenStart.getDate() - 6)

  // 6 jours d'épisodes sur 7 jours (skip jour 4 = il y a 3 jours)
  const dayOffsets = [6, 5, 4, 2, 1, 0]
  const templates = [
    { condition: 'migraine', zones: ['tete'], triggers: ['Stress'], treatment: 'Triptan', extra: ['Nausée'], intensity: 6, duration: '2-4h', hour: 8 },
    { condition: 'sii', zones: ['abdomen'], triggers: ['Aliment gras'], treatment: 'Antispasmodique', extra: ['Molle'], intensity: 4, duration: '<1h', hour: 12 },
    { condition: 'fibro', zones: ['torse', 'brasG'], triggers: ['Sommeil'], treatment: 'Antalgique', extra: ['Fatigue intense'], intensity: 7, duration: '½ jour', hour: 7 },
    { condition: 'migraine', zones: ['tete'], triggers: ['Écran', 'Stress'], treatment: 'Aucun', extra: ['Photophobie'], intensity: 5, duration: '2-4h', hour: 14 },
    { condition: 'sii', zones: ['abdomen'], triggers: ['Lactose'], treatment: 'Aucun', extra: ['Liquide'], intensity: 3, duration: '<1h', hour: 16 },
    { condition: 'fibro', zones: ['jambeG', 'jambeD'], triggers: ['Effort', 'Froid'], treatment: 'Antalgique', extra: ['Raideur matinale'], intensity: 8, duration: '+1j', hour: 9 },
  ]

  const episodes = dayOffsets.map((offset, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - offset)
    date.setHours(templates[i].hour, Math.floor(Math.random() * 40 + 10), 0, 0)
    const t = templates[i]
    return {
      id: crypto.randomUUID(),
      createdAt: date.toISOString(),
      condition: t.condition,
      zones: t.zones,
      intensity: t.intensity,
      duration: t.duration,
      triggers: t.triggers,
      treatment: t.treatment,
      efficacy: t.treatment !== 'Aucun' ? ['Un peu', 'Bien', 'Pas encore'][i % 3] : null,
      extra: t.extra,
    }
  })

  const lastPeriod = new Date(now)
  lastPeriod.setDate(lastPeriod.getDate() - 12)

  const profile = {
    gender: 'f',
    cycleOn: true,
    cycleLength: 28,
    lastPeriod: dayKeyForSeed(lastPeriod),
    gardenStartDate: dayKeyForSeed(gardenStart),
    completedGardens: 1,
  }

  try {
    localStorage.setItem(`pousse.${TEST_ID}.episodes.v1`, JSON.stringify(episodes))
    localStorage.setItem(`pousse.${TEST_ID}.profile.v1`, JSON.stringify(profile))
    localStorage.setItem(versionKey, String(SEED_VERSION))
  } catch (e) {
    console.error('Echec du seed compte test', e)
  }
}
