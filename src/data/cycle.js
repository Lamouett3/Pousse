// =============================================================
// Suivi du cycle : règles, cycle calculé, prévisions, fertilité, lien avec les crises
//
// Données dans le profil (synchronisé) :
//   cycleMode      'natural' | 'endo' | 'pill' | 'no_period' | 'menopause' | 'pregnancy'
//   periods        [{ id, start: 'AAAA-MM-JJ', end: 'AAAA-MM-JJ' | null, flow: { 'AAAA-MM-JJ': niveau } }]
//                  niveau : 'spotting' | 'leger' | 'moyen' | 'abondant'
//   fertileWindowOn  fenêtre de fertilité affichée (facultatif, indicatif)
// Compatibilité : `lastPeriod` et `periodHistory` (anciens champs) restent
// renseignés à partir de `periods` ; un ancien profil est repris
// automatiquement (normalizePeriods).
//
// Aucun import depuis storage.js (qui importe ce module).
// =============================================================

const pad = (n) => String(n).padStart(2, '0')
export const dayKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKeyOf(d) }
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000)

// ---- Situations de vie ----
export const CYCLE_MODES = [
  { v: 'natural', label: 'Cycle naturel' },
  { v: 'endo', label: 'Endométriose' },
  { v: 'pill', label: 'Pilule' },
  { v: 'no_period', label: 'Sans règles régulières', hint: 'Stérilet hormonal, implant, pilule en continu…' },
  { v: 'menopause', label: 'Ménopause' },
  { v: 'pregnancy', label: 'Grossesse' },
]
export const hasPhases = (profile) => ['natural', 'endo', 'pill'].includes(profile.cycleMode || 'natural')
export const hasPredictions = (profile) => ['natural', 'endo'].includes(profile.cycleMode || 'natural')
// Saisie de règles ou de saignements possible (pas pendant une grossesse)
export const canLogBleeding = (profile) => (profile.cycleMode || 'natural') !== 'pregnancy'

export const FLOW_LEVELS = [
  { v: 'spotting', label: 'Spotting', short: 'S' },
  { v: 'leger', label: 'Léger', short: 'L' },
  { v: 'moyen', label: 'Moyen', short: 'M' },
  { v: 'abondant', label: 'Abondant', short: 'A' },
]
const FLOW_RANK = { spotting: 1, leger: 2, moyen: 3, abondant: 4 }

// ---- Règles enregistrées ----
export function normalizePeriods(profile) {
  if (Array.isArray(profile.periods) && profile.periods.length) {
    return [...profile.periods].filter((p) => p && p.start).sort((a, b) => b.start.localeCompare(a.start))
  }
  // Reprise d'un ancien profil : débuts connus, sans fin ni abondance
  const starts = [...new Set([...(profile.periodHistory || []), profile.lastPeriod].filter(Boolean))]
  return starts.sort((a, b) => b.localeCompare(a)).map((start) => ({ id: `p-${start}`, start, end: null, flow: {} }))
}

// Patch profil cohérent (nouveaux et anciens champs) après modification des règles
export function periodsPatch(periods) {
  const sorted = [...periods].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 60)
  return {
    periods: sorted,
    lastPeriod: sorted[0]?.start || '',
    periodHistory: sorted.map((p) => p.start).slice(0, 24),
  }
}

export const periodLength = (p) => (p.end ? daysBetween(p.start, p.end) + 1 : null)

// Règles en cours : sans fin, commencées il y a 12 jours au plus
export function ongoingPeriod(profile, today = dayKeyOf(new Date())) {
  const p = normalizePeriods(profile)[0]
  if (!p || p.end) return null
  const d = daysBetween(p.start, today)
  return d >= 0 && d <= 12 ? p : null
}

export function startPeriodPatch(profile, day = dayKeyOf(new Date())) {
  const list = normalizePeriods(profile)
  if (list.some((p) => p.start === day)) return null
  // Une règle précédente restée « ouverte » est close la veille
  const closed = list.map((p) => (!p.end && p.start < day ? { ...p, end: addDays(day, -1) < p.start ? p.start : closeGuess(p, day) } : p))
  return periodsPatch([{ id: crypto.randomUUID(), start: day, end: null, flow: {} }, ...closed])
}
// Fin estimée d'une règle restée ouverte : dernier jour d'abondance noté, sinon début + 4 jours (au plus la veille)
function closeGuess(p, nextStart) {
  const flowDays = Object.keys(p.flow || {}).sort()
  const guess = flowDays.length ? flowDays[flowDays.length - 1] : addDays(p.start, 4)
  const limit = addDays(nextStart, -1)
  return guess < limit ? guess : limit
}

export function endPeriodPatch(profile, day = dayKeyOf(new Date())) {
  const list = normalizePeriods(profile)
  const p = list[0]
  if (!p || p.end) return null
  return periodsPatch(list.map((x) => (x.id === p.id ? { ...x, end: day < p.start ? p.start : day } : x)))
}

export function setFlowPatch(profile, periodId, day, level) {
  const list = normalizePeriods(profile)
  return periodsPatch(list.map((p) => {
    if (p.id !== periodId) return p
    const flow = { ...(p.flow || {}) }
    if (!level || flow[day] === level) delete flow[day]
    else flow[day] = level
    return { ...p, flow }
  }))
}

// Ajout ou modification de règles passées ; renvoie { patch } ou { error }
export function upsertPeriodPatch(profile, { id, start, end }) {
  const today = dayKeyOf(new Date())
  if (!start) return { error: 'Indique la date de début' }
  if (start > today) return { error: 'Le début ne peut pas être dans le futur' }
  if (end && end < start) return { error: 'La fin doit être après le début' }
  if (end && end > today) return { error: 'La fin ne peut pas être dans le futur' }
  if (end && daysBetween(start, end) > 20) return { error: 'Des règles de plus de 3 semaines : vérifie les dates' }
  const list = normalizePeriods(profile).filter((p) => p.id !== id)
  const s2 = end || start
  const overlap = list.find((p) => {
    const pe = p.end || p.start
    return !(s2 < p.start || start > pe)
  })
  if (overlap) return { error: 'Ces dates chevauchent des règles déjà notées' }
  const prev = normalizePeriods(profile).find((p) => p.id === id)
  const flow = Object.fromEntries(Object.entries(prev?.flow || {}).filter(([k]) => k >= start && (!end || k <= end)))
  return { patch: periodsPatch([...list, { id: id || crypto.randomUUID(), start, end: end || null, flow }]) }
}

export const deletePeriodPatch = (profile, id) => periodsPatch(normalizePeriods(profile).filter((p) => p.id !== id))

// Abondance maximale d'une règle
export function maxFlow(p) {
  const levels = Object.values(p.flow || {})
  if (!levels.length) return null
  return levels.sort((a, b) => FLOW_RANK[b] - FLOW_RANK[a])[0]
}

// ---- Cycle calculé ----
// Durées entre débuts consécutifs (6 derniers cycles), valeurs aberrantes écartées
export function cycleStats(profile) {
  const starts = normalizePeriods(profile).map((p) => p.start).sort()
  const lengths = []
  for (let i = 1; i < starts.length; i++) {
    const d = daysBetween(starts[i - 1], starts[i])
    if (d >= 15 && d <= 60) lengths.push(d)
  }
  const recent = lengths.slice(-6)
  const logged = normalizePeriods(profile).map(periodLength).filter((n) => n && n <= 15)
  const avgPeriod = logged.length ? Math.round(logged.slice(0, 6).reduce((a, b) => a + b, 0) / Math.min(6, logged.length)) : null
  if (!recent.length) return { count: 0, lengths: [], avg: null, variability: null, irregular: false, avgPeriod }
  const avg = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
  const variability = Math.max(...recent) - Math.min(...recent)
  return {
    count: recent.length, lengths: recent, avg, variability,
    // Écart de plus de 7 jours entre le cycle le plus court et le plus long : repère indicatif
    irregular: recent.length >= 3 && variability > 7,
    avgPeriod,
  }
}

// Durée utilisée pour les phases : calculée dès 2 cycles connus, sinon celle déclarée
export function effectiveCycleLength(profile, fallback) {
  const s = cycleStats(profile)
  return s.count >= 2 ? s.avg : fallback
}

// ---- Prévisions (cycle naturel ou endométriose) ----
// Règles prévues entre `from` et `to` (clés de jours), après les dernières règles notées
export function predictedPeriodDays(profile, from, to, fallbackLength = 28, fallbackPeriod = 5) {
  const out = new Set()
  if (!hasPredictions(profile)) return out
  const last = normalizePeriods(profile)[0]
  if (!last) return out
  const s = cycleStats(profile)
  const len = s.count >= 2 ? s.avg : fallbackLength
  const dur = s.avgPeriod || fallbackPeriod
  let start = addDays(last.start, len)
  for (let i = 0; i < 12 && start <= to; i++) {
    for (let d = 0; d < dur; d++) {
      const k = addDays(start, d)
      if (k >= from && k <= to) out.add(k)
    }
    start = addDays(start, len)
  }
  return out
}

// Fenêtre de fertilité INDICATIVE (ovulation ≈ 14 jours avant les règles suivantes,
// fenêtre de 5 jours avant à 1 jour après). Jamais une méthode de contraception.
export function fertileDays(profile, from, to, fallbackLength = 28) {
  const out = new Set()
  if (!profile.fertileWindowOn || !hasPredictions(profile)) return out
  const last = normalizePeriods(profile)[0]
  if (!last) return out
  const s = cycleStats(profile)
  const len = s.count >= 2 ? s.avg : fallbackLength
  let next = addDays(last.start, len)
  for (let i = 0; i < 12; i++) {
    const ovulation = addDays(next, -14)
    for (let d = -5; d <= 1; d++) {
      const k = addDays(ovulation, d)
      if (k >= from && k <= to) out.add(k)
    }
    if (next > to) break
    next = addDays(next, len)
  }
  return out
}

// Jours de règles notés : Map jour → abondance (ou 'noté')
export function loggedPeriodDays(profile, from, to) {
  const out = new Map()
  const today = dayKeyOf(new Date())
  for (const p of normalizePeriods(profile)) {
    const end = p.end || (ongoingPeriod(profile) && ongoingPeriod(profile).id === p.id ? today : addDays(p.start, 4))
    for (let k = p.start; k <= end; k = addDays(k, 1)) {
      if (k >= from && k <= to) out.set(k, p.flow?.[k] || 'note')
    }
  }
  return out
}

// ---- Lien crises / règles ----
// Fenêtre menstruelle : du 2e jour avant au 3e jour après le début des règles (J-2 à J+3).
// Migraine menstruelle (ICHD-3, annexe A1.1.1) : crises dans cette fenêtre au cours
// d'au moins 2 cycles sur 3. Critère indicatif, à interpréter par le médecin.
export function menstrualAnalysis(profile, episodes, condition = 'migraine') {
  const starts = normalizePeriods(profile).map((p) => p.start).sort()
  const eps = episodes.filter((e) => e.condition === condition)
  const cycles = starts.slice(-12).map((s) => {
    const inWindow = eps.filter((e) => {
      const d = daysBetween(s, dayKeyOf(new Date(e.createdAt)))
      return d >= -2 && d <= 3
    })
    return { start: s, attacks: inWindow.length }
  })
  const last3 = cycles.slice(-3)
  const withAttacks = cycles.filter((c) => c.attacks > 0).length
  const inWindowTotal = cycles.reduce((n, c) => n + c.attacks, 0)
  return {
    cycles, withAttacks, inWindowTotal,
    totalEpisodes: eps.length,
    criterion: last3.length === 3 ? last3.filter((c) => c.attacks > 0).length >= 2 : null,
  }
}
