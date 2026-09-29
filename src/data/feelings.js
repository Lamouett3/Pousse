// =============================================================
// Ressentis du jour (« Comment te sens-tu aujourd'hui ? »)
// Définitions et calculs partagés par l'accueil, l'historique et le rapport.
//
// Stockage : un ressenti par jour via addCycleLog / saveCycleLog
// (clé `pousse.<compte>.cycleLogs.v1`), de la forme
//   { day: 'AAAA-MM-JJ', createdAt, mood, energy, symptoms: [] }
// Les clés ci-dessous sont celles déjà enregistrées : ne pas les renommer.
// =============================================================
import { filterByPeriod } from './stats'

export const FEELING_MOODS = [
  { key: 'bien', f: 'Bien', h: 'Bien', n: 'Bien', icon: 'ti-mood-happy' },
  { key: 'fatigue', f: 'Fatiguée', h: 'Fatigué', n: 'Fatigué·e', icon: 'ti-zzz' },
  { key: 'irritable', f: 'Irritable', h: 'Irritable', n: 'Irritable', icon: 'ti-mood-angry' },
  { key: 'anxieuse', f: 'Anxieuse', h: 'Anxieux', n: 'Anxieux·se', icon: 'ti-mood-nervous' },
]
export const FEELING_ENERGY = [
  { key: 'basse', label: 'Basse', icon: 'ti-battery-1' },
  { key: 'normale', label: 'Normale', icon: 'ti-battery-2' },
  { key: 'haute', label: 'Haute', icon: 'ti-battery-4' },
]
export const FEELING_SYMPTOMS = [
  { key: 'maux_tete', label: 'Maux de tête' },
  { key: 'crampes', label: 'Crampes' },
  { key: 'ballonnements', label: 'Ballonnements' },
  { key: 'seins', label: 'Seins sensibles', only: ['f', 'n'] },
]

// Genre du profil → forme grammaticale ('f' par défaut, comme l'app d'origine)
export const genderKey = (gender) => (gender === 'h' ? 'h' : gender === 'n' ? 'n' : 'f')

export const moodLabel = (key, g = 'f') => FEELING_MOODS.find((m) => m.key === key)?.[g] || null
export const energyLabel = (key) => FEELING_ENERGY.find((e) => e.key === key)?.label || null
export const symptomLabel = (key) => FEELING_SYMPTOMS.find((s) => s.key === key)?.label || key

// Parties lisibles d'un ressenti : ['Fatiguée', 'énergie basse', 'maux de tête']
export function feelingParts(log, g = 'f') {
  if (!log) return []
  return [
    log.mood && moodLabel(log.mood, g),
    log.energy && `énergie ${energyLabel(log.energy)?.toLowerCase()}`,
    ...(log.symptoms || []).map((k) => symptomLabel(k).toLowerCase()),
  ].filter(Boolean)
}

// Un ressenti est-il vide (rien de coché) ?
export const isEmptyFeeling = (log) => !log || (!log.mood && !log.energy && !(log.symptoms || []).length)

// Ressentis d'une période, triés du plus ancien au plus récent.
// Réutilise filterByPeriod en situant chaque ressenti à midi de son jour.
export function feelingsInPeriod(logs, period, offset = 0) {
  const withDate = (logs || [])
    .filter((l) => l && l.day && !isEmptyFeeling(l))
    .map((l) => ({ ...l, createdAt: `${l.day}T12:00:00` }))
  return filterByPeriod(withDate, period, offset).sort((a, b) => a.day.localeCompare(b.day))
}

export const feelingForDay = (logs, dayK) => (logs || []).find((l) => l.day === dayK && !isEmptyFeeling(l)) || null

// Synthèse d'une liste de ressentis
export function summarizeFeelings(list, g = 'f') {
  const count = (arr) => arr.reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc }, {})
  const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || null
  const moods = count(list.map((l) => l.mood).filter(Boolean))
  const energies = count(list.map((l) => l.energy).filter(Boolean))
  const symptoms = count(list.flatMap((l) => l.symptoms || []))
  const tm = top(moods)
  const ts = top(symptoms)
  return {
    days: list.length,
    topMood: tm ? { label: moodLabel(tm[0], g), count: tm[1] } : null,
    lowEnergyDays: energies.basse || 0,
    topSymptom: ts ? { label: symptomLabel(ts[0]), count: ts[1] } : null,
  }
}

// Date lisible d'un jour 'AAAA-MM-JJ' : « mardi 22 sept. »
export function dayLabel(dayK, opts = { weekday: 'long', day: 'numeric', month: 'short' }) {
  const [y, m, d] = dayK.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', opts)
}
