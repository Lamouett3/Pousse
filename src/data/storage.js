// =============================================================
// Persistance des données — localStorage
// MVP : tout reste sur l'appareil (pas de serveur).
// Voir CLAUDE.md §9 pour la stratégie réglementaire.
// Cles namespacees par compte (voir auth.js).
// =============================================================

import { currentAccountId } from './auth'
import { track } from './outbox'
import { effectiveCycleLength, hasPhases, normalizePeriods, startPeriodPatch } from './cycle'

const nowIso = () => new Date().toISOString()

function ns() { return `pousse.${currentAccountId()}` }
function episodesKey() { return `${ns()}.episodes.v1` }
function profileKey() { return `${ns()}.profile.v1` }

// ---- Épisodes ----

export function loadEpisodes() {
  try {
    const raw = localStorage.getItem(episodesKey())
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveEpisode(episode) {
  const episodes = loadEpisodes()
  const withId = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...episode, updatedAt: nowIso() }
  episodes.push(withId)
  try {
    localStorage.setItem(episodesKey(), JSON.stringify(episodes))
  } catch (e) {
    console.error('Échec de sauvegarde', e)
    throw new Error('storage')
  }
  track('episodes', withId.id)
  return withId
}

export function updateEpisode(id, patch) {
  const updatedAt = nowIso()
  const episodes = loadEpisodes().map((e) => (e.id === id ? { ...e, ...patch, updatedAt } : e))
  try {
    localStorage.setItem(episodesKey(), JSON.stringify(episodes))
  } catch (e) {
    console.error('Échec de mise à jour', e)
    throw new Error('storage')
  }
  track('episodes', id, 'upsert', updatedAt)
}

export function deleteEpisode(id) {
  const episodes = loadEpisodes().filter((e) => e.id !== id)
  localStorage.setItem(episodesKey(), JSON.stringify(episodes))
  track('episodes', id, 'delete')
}

// ---- Écritures issues du serveur (synchronisation) : ne repassent pas par la boîte d'envoi ----
export function writeEpisodesRaw(list) { localStorage.setItem(episodesKey(), JSON.stringify(list)) }
export function writeShortcutsRaw(list) { localStorage.setItem(shortcutsKey(), JSON.stringify(list)) }
export function writeCycleLogsRaw(list) { localStorage.setItem(cycleLogKey(), JSON.stringify(list)) }
export function writeProfileRaw(profile) { localStorage.setItem(profileKey(), JSON.stringify(profile)) }
export function readProfileRaw() {
  try { return JSON.parse(localStorage.getItem(profileKey()) || 'null') } catch { return null }
}

// ---- Raccourcis ----

function shortcutsKey() { return `${ns()}.shortcuts.v1` }

export function loadShortcuts() {
  try {
    const raw = localStorage.getItem(shortcutsKey())
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveShortcut(shortcut) {
  const list = loadShortcuts()
  const withId = { id: crypto.randomUUID(), ...shortcut, updatedAt: nowIso() }
  list.push(withId)
  localStorage.setItem(shortcutsKey(), JSON.stringify(list))
  track('shortcuts', withId.id)
  return withId
}

export function removeShortcut(id) {
  const list = loadShortcuts().filter(s => s.id !== id)
  localStorage.setItem(shortcutsKey(), JSON.stringify(list))
  track('shortcuts', id, 'delete')
}

// ---- Profil ----

const DEFAULT_PROFILE = {
  gender: 'f',
  birthYear: null,  // année de naissance (facultative), cf. Profil
  heightCm: null,   // taille (cm), facultative
  weightHistory: [], // [{ date, kg }] — historique du poids, cf. data/lifestyle.js
  lifestyle: {},    // tabac, alcool, caféine, drogues (+ choix d'affichage dans le rapport)
  quickFavorites: [], // pathologies favorites de « Noter vite » (4 au plus, dans l'ordre)
  myTreatments: [],  // mes traitements habituels [{ id, name, dose, frequency, inReport }]
  customConditions: [], // pathologies personnelles [{ id: 'perso-…', label, icon, accent, archived }]
  cycleOn: true,
  cycleLength: 28,
  lastPeriod: '',
  cycleMode: 'natural', // 'natural' | 'endo' | 'pill' | 'no_period' | 'menopause' | 'pregnancy' (cf. data/cycle.js)
  pillActiveDays: 21,
  pillBreakDays: 7,
  pillPackStart: '',
  periodDays: null,      // null = défaut du mode (5 naturel, 7 endo)
  lutealDays: null,      // null = défaut 14
  ovulationDays: null,   // null = défaut 3
  periodHistory: [],     // ancien historique des débuts (compatibilité ; source : periods)
  periods: [],           // règles notées [{ id, start, end, flow }] (cf. data/cycle.js)
  fertileWindowOn: false, // fenêtre de fertilité indicative, désactivée par défaut
  moonOn: false,    // repères lunaires — désactivé par défaut (cf. CLAUDE.md §3)
  gardenStartDate: null,
  completedGardens: 0,
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(profileKey())
    const profile = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE }
    // Auto-init gardenStartDate au premier chargement
    if (!profile.gardenStartDate) {
      profile.gardenStartDate = dayKey(new Date())
      // Initialisation automatique : ni datée ni envoyée au serveur, pour ne
      // jamais écraser le vrai profil d'un compte sur un nouvel appareil.
      writeProfileRaw(profile)
    }
    return profile
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function saveProfile(profile) {
  try {
    const updatedAt = nowIso()
    localStorage.setItem(profileKey(), JSON.stringify({ ...profile, updatedAt }))
    track('profile', null, 'upsert', updatedAt)
  } catch (e) {
    console.error('Échec de sauvegarde du profil', e)
    throw new Error('storage')
  }
}

// ---- Phase du cycle menstruel ----

export const CYCLE_PHASES = [
  { label: 'Règles',       icon: 'ti-droplet',  color: 'pink' },
  { label: 'Folliculaire', icon: 'ti-arrow-up', color: 'green' },
  { label: 'Ovulation',    icon: 'ti-sun',      color: 'amber' },
  { label: 'Lutéale',      icon: 'ti-leaf',     color: 'sand' },
]

export const CYCLE_LENGTH_RANGE = {
  natural: { min: 18, max: 45, default: 28 },
  endo:    { min: 18, max: 60, default: 35 },
}

export const PHASE_RANGES = {
  periodDays:    { min: 1, max: 10 },
  lutealDays:    { min: 7, max: 17 },
  ovulationDays: { min: 1, max: 5 },
}

/**
 * Résout les durées effectives des phases en tenant compte du mode et des valeurs personnalisées.
 */
export function getEffectivePhaseDurations(profile) {
  const isEndo = profile.cycleMode === 'endo'
  const range = CYCLE_LENGTH_RANGE[isEndo ? 'endo' : 'natural']
  // Durée calculée à partir des règles notées dès 2 cycles connus, sinon celle déclarée
  const cycleLen = effectiveCycleLength(profile, profile.cycleLength || range.default)
  const periodDays = profile.periodDays ?? (isEndo ? 7 : 5)
  const lutealDays = profile.lutealDays ?? 14
  const ovulationDays = profile.ovulationDays ?? 3
  const follicularDays = Math.max(1, cycleLen - periodDays - ovulationDays - lutealDays)
  return { cycleLen, periodDays, lutealDays, ovulationDays, follicularDays }
}

/**
 * Calcule la phase pilule.
 * Renvoie { label, icon, color, day, total, phaseDay, phaseTotal, phaseIndex } ou null.
 */
export function getPillPhase(profile, targetDate = new Date()) {
  if (!profile.cycleOn || !profile.pillPackStart) return null
  const start = new Date(profile.pillPackStart)
  if (isNaN(start.getTime())) return null
  const today = targetDate instanceof Date ? targetDate : new Date(targetDate)
  const diffMs = today.getTime() - start.getTime()
  if (diffMs < 0) return null
  const active = profile.pillActiveDays || 21
  const pause = profile.pillBreakDays ?? 7
  const totalLen = active + pause
  const dayInCycle = (Math.floor(diffMs / 86400000) % totalLen) + 1
  if (dayInCycle <= active) {
    return { label: 'Pilule active', icon: 'ti-pill', color: 'green', day: dayInCycle, total: totalLen, phaseDay: dayInCycle, phaseTotal: active, phaseIndex: 0 }
  }
  const pauseDay = dayInCycle - active
  return { label: 'Pause', icon: 'ti-droplet', color: 'pink', day: dayInCycle, total: totalLen, phaseDay: pauseDay, phaseTotal: pause, phaseIndex: 1 }
}

/**
 * Calcule la phase actuelle du cycle menstruel.
 * Renvoie { label, icon, color, day, total, phaseDay, phaseTotal, phaseIndex } ou null.
 * Si cycleMode === 'pill', delegue a getPillPhase.
 */
export function getCyclePhase(profile, targetDate = new Date()) {
  if (profile.cycleMode === 'pill') return getPillPhase(profile, targetDate)
  // Sans règles régulières, ménopause, grossesse : pas de phases prévues
  if (!hasPhases(profile)) return null
  const lastStart = normalizePeriods(profile)[0]?.start || profile.lastPeriod
  if (!profile.cycleOn || !lastStart) return null
  const start = new Date(lastStart)
  if (isNaN(start.getTime())) return null
  const today = targetDate instanceof Date ? targetDate : new Date(targetDate)
  const diffMs = today.getTime() - start.getTime()
  if (diffMs < 0) return null
  const { cycleLen, periodDays, follicularDays, ovulationDays } = getEffectivePhaseDurations(profile)
  const dayInCycle = (Math.floor(diffMs / 86400000) % cycleLen) + 1

  const thresholds = [
    { max: periodDays, duration: periodDays, ...CYCLE_PHASES[0] },
    { max: periodDays + follicularDays, duration: follicularDays, ...CYCLE_PHASES[1] },
    { max: periodDays + follicularDays + ovulationDays, duration: ovulationDays, ...CYCLE_PHASES[2] },
    { max: cycleLen, duration: cycleLen - periodDays - follicularDays - ovulationDays, ...CYCLE_PHASES[3] },
  ]

  let cumul = 0
  for (let i = 0; i < thresholds.length; i++) {
    const phase = thresholds[i]
    if (dayInCycle <= phase.max) {
      const phaseDay = dayInCycle - cumul
      return { label: phase.label, icon: phase.icon, color: phase.color, day: dayInCycle, total: cycleLen, phaseDay, phaseTotal: phase.duration, phaseIndex: i }
    }
    cumul = phase.max
  }
  return { ...CYCLE_PHASES[3], day: dayInCycle, total: cycleLen, phaseDay: dayInCycle - cumul, phaseTotal: thresholds[3].duration, phaseIndex: 3 }
}

/**
 * Retourne les 3 prochaines phases du cycle avec { label, icon, color, startsIn, duration }.
 */
export function getUpcomingPhases(profile) {
  const phase = getCyclePhase(profile)
  if (!phase) return []
  if (profile.cycleMode === 'pill') {
    const active = profile.pillActiveDays || 21
    const pause = profile.pillBreakDays ?? 7
    if (pause === 0) return [] // pilule en continu : pas de pause à annoncer
    const pillPhases = [
      { label: 'Pilule active', icon: 'ti-pill', color: 'green', duration: active },
      { label: 'Pause', icon: 'ti-droplet', color: 'pink', duration: pause },
    ]
    const upcoming = []
    let idx = phase.phaseIndex
    let remaining = phase.phaseTotal - phase.phaseDay
    for (let i = 0; i < 3; i++) {
      idx = (idx + 1) % pillPhases.length
      const p = pillPhases[idx]
      upcoming.push({ ...p, startsIn: remaining + 1 })
      remaining += p.duration
    }
    return upcoming
  }

  const { periodDays, follicularDays, ovulationDays, lutealDays } = getEffectivePhaseDurations(profile)
  const durations = [periodDays, follicularDays, ovulationDays, lutealDays]
  const upcoming = []
  let idx = phase.phaseIndex
  let remaining = phase.phaseTotal - phase.phaseDay
  for (let i = 0; i < 3; i++) {
    idx = (idx + 1) % 4
    const p = CYCLE_PHASES[idx]
    upcoming.push({ label: p.label, icon: p.icon, color: p.color, startsIn: remaining + 1, duration: durations[idx] })
    remaining += durations[idx]
  }
  return upcoming
}

/**
 * Retourne un patch profil pour marquer le début des règles aujourd'hui.
 * Évite les doublons si déjà appelé aujourd'hui.
 */
export function logPeriodStart(profile) {
  // Enregistre une vraie période de règles (début aujourd'hui, fin à préciser)
  return startPeriodPatch(profile, dayKey(new Date()))
}

// ---- Journal de cycle ----

function cycleLogKey() { return `${ns()}.cycleLogs.v1` }

export function loadCycleLogs() {
  try {
    const raw = localStorage.getItem(cycleLogKey())
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveCycleLog(log) {
  const logs = loadCycleLogs()
  const today = dayKey(new Date())
  // Un seul log par jour — écraser si existe
  const existing = logs.findIndex((l) => l.day === today)
  const entry = { day: today, createdAt: new Date().toISOString(), ...log, updatedAt: nowIso() }
  if (existing >= 0) {
    logs[existing] = { ...logs[existing], ...entry }
  } else {
    logs.push(entry)
  }
  localStorage.setItem(cycleLogKey(), JSON.stringify(logs))
  track('feelings', today, 'upsert', entry.updatedAt)
  return entry
}

// ---- Helpers de dates ----

export function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Renvoie l'ensemble des jours (clé AAAA-MM-JJ) où au moins un épisode a été noté
export function loggedDays(episodes) {
  return new Set(episodes.map((e) => dayKey(e.createdAt)))
}

/**
 * Compte les jours distincts avec episode depuis gardenStartDate.
 * Renvoie un Set de day keys.
 */
export function gardenLoggedDays(episodes, gardenStartDate) {
  if (!gardenStartDate) return new Set()
  return new Set(
    episodes
      .map((e) => dayKey(e.createdAt))
      .filter((dk) => dk >= gardenStartDate)
  )
}

// Calcule la série en cours (jours consécutifs avec au moins un signalement,
// en partant d'aujourd'hui ou d'hier pour ne pas casser la série en cours de journée)
export function currentStreak(episodes) {
  const days = loggedDays(episodes)
  if (days.size === 0) return 0
  let streak = 0
  const cursor = new Date()
  // tolérance : si rien aujourd'hui, on regarde à partir d'hier
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
