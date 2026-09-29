// =============================================================
// Agrégations statistiques calculées à partir des épisodes réels.
// Utilisé par le dashboard (vue perso) et le rapport (vue médecin).
// =============================================================

import { dayKey } from './storage'

function fmt1(n) {
  return (Math.round(n * 10) / 10).toString().replace('.', ',')
}

// Exclut les épisodes "bien-être" (pas de symptôme, juste maintien de serie)
// ---- Suivi de l'efficacité du traitement (« en deux temps », CLAUDE.md §3) ----
// Un épisode attend une réponse si un traitement a été pris et que l'efficacité
// n'est pas encore connue (null ou « Pas encore »), pendant 48 h après la prise.
// Répondre « Pas encore » repousse simplement la question de quelques heures.
export const EFFICACY_WINDOW_MS = 48 * 60 * 60 * 1000
export const EFFICACY_SNOOZE_MS = 3 * 60 * 60 * 1000
export function needsEfficacyFollowUp(e, now = Date.now()) {
  if (!e.treatment || e.treatment === 'Aucun') return false
  if (e.efficacy && e.efficacy !== 'Pas encore') return false
  if (now - new Date(e.createdAt).getTime() > EFFICACY_WINDOW_MS) return false
  if (e.efficacyAskedAt && now - new Date(e.efficacyAskedAt).getTime() < EFFICACY_SNOOZE_MS) return false
  return true
}

export function withoutBienetre(episodes) {
  return episodes.filter((e) => e.condition !== 'bienetre')
}

// Filtre les épisodes d'une pathologie (ou tous si null)
export function filterByCondition(episodes, condition) {
  return condition ? episodes.filter((e) => e.condition === condition) : episodes
}

// Stats globales sur un ensemble d'épisodes
export function computeStats(episodes) {
  const n = episodes.length
  if (n === 0) {
    return { count: 0, avgIntensity: '—', avgDurationLabel: '—', topTriggers: [], treatments: [] }
  }
  const avgIntensity = fmt1(episodes.reduce((s, e) => s + (e.intensity || 0), 0) / n)

  // Déclencheurs les plus fréquents
  const trigCount = {}
  episodes.forEach((e) => (e.triggers || []).forEach((t) => { trigCount[t] = (trigCount[t] || 0) + 1 }))
  const topTriggers = Object.entries(trigCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([label, count]) => ({ label, count }))

  // Traitements et efficacité
  const tre = {}
  episodes.forEach((e) => {
    if (!e.treatment || e.treatment === 'Aucun') return
    if (!tre[e.treatment]) tre[e.treatment] = { taken: 0, evaluated: 0, relieved: 0 }
    tre[e.treatment].taken++
    if (e.efficacy != null && e.efficacy !== 'Pas encore') {
      tre[e.treatment].evaluated++
      if (e.efficacy === 'Bien' || e.efficacy === 'Un peu') tre[e.treatment].relieved++
    }
  })
  const treatments = Object.entries(tre).map(([name, v]) => ({ name, ...v }))

  return { count: n, avgIntensity, topTriggers, treatments }
}

// Série temporelle pour le dashboard (semaine / mois / année)
// Renvoie { bars: [{v, c}], labels: [] } où v = intensité repère, c = palier
export function buildSeries(episodes, view, offset = 0) {
  const ref = getRefDate(view, offset)
  const byDay = {}
  episodes.forEach((e) => {
    const k = dayKey(e.createdAt)
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(e)
  })

  const level = (maxIntensity) => (maxIntensity === 0 ? 'empty' : maxIntensity <= 4 ? 'calm' : maxIntensity <= 7 ? 'light' : 'strong')

  if (view === 's') {
    const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    const monday = new Date(ref)
    const dow = (ref.getDay() + 6) % 7
    monday.setDate(ref.getDate() - dow)
    const bars = labels.map((_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      const eps = byDay[dayKey(d)] || []
      const maxI = eps.reduce((m, e) => Math.max(m, e.intensity || 0), 0)
      return { v: eps.length ? maxI : 0, c: level(eps.length ? maxI : 0) }
    })
    return { bars, labels }
  }

  if (view === 'm') {
    const labels = ['S1', 'S2', 'S3', 'S4']
    const bars = labels.map((_, w) => {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1 + w * 7)
      let maxI = 0, count = 0
      for (let d = 0; d < 7; d++) {
        const day = new Date(start); day.setDate(start.getDate() + d)
        const eps = byDay[dayKey(day)] || []
        eps.forEach((e) => { maxI = Math.max(maxI, e.intensity || 0); count++ })
      }
      return { v: count ? maxI : 0, c: level(count ? maxI : 0) }
    })
    return { bars, labels }
  }

  // année
  const labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const bars = labels.map((_, m) => {
    let maxI = 0, count = 0
    Object.entries(byDay).forEach(([k, eps]) => {
      const d = new Date(k)
      if (d.getFullYear() === ref.getFullYear() && d.getMonth() === m) {
        eps.forEach((e) => { maxI = Math.max(maxI, e.intensity || 0); count++ })
      }
    })
    return { v: count ? maxI : 0, c: level(count ? maxI : 0) }
  })
  return { bars, labels }
}

// ---- Nouvelles fonctions temporelles ----

// Extrait l'heure lisible d'un ISO timestamp : "14h32", "9h05"
export function formatHour(isoString) {
  const d = new Date(isoString)
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`
}

// Calcule la date de reference decalee de `offset` périodes
export function getRefDate(period, offset = 0) {
  const now = new Date()
  if (offset === 0) return now
  const ref = new Date(now)
  if (period === 'j') ref.setDate(ref.getDate() + offset)
  else if (period === 's') ref.setDate(ref.getDate() + offset * 7)
  else if (period === 'm') ref.setMonth(ref.getMonth() + offset)
  else ref.setFullYear(ref.getFullYear() + offset)
  return ref
}

// Filtre les épisodes par période relative a maintenant, decalee de `offset`
export function filterByPeriod(episodes, period, offset = 0) {
  const ref = getRefDate(period, offset)

  if (period === 'j') {
    const refKey = dayKey(ref)
    return episodes.filter((e) => dayKey(e.createdAt) === refKey)
  }

  if (period === 's') {
    const monday = new Date(ref)
    const dow = (ref.getDay() + 6) % 7
    monday.setDate(ref.getDate() - dow)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return episodes.filter((e) => {
      const d = new Date(e.createdAt)
      return d >= monday && d <= sunday
    })
  }

  if (period === 'm') {
    const y = ref.getFullYear(), m = ref.getMonth()
    return episodes.filter((e) => {
      const d = new Date(e.createdAt)
      return d.getFullYear() === y && d.getMonth() === m
    })
  }

  // 'a'
  const y = ref.getFullYear()
  return episodes.filter((e) => new Date(e.createdAt).getFullYear() === y)
}

// Épisodes du jour tries par heure, avec champ `hour` ajoute
export function buildDaySeries(episodes, offset = 0) {
  const ref = getRefDate('j', offset)
  const refKey = dayKey(ref)
  return episodes
    .filter((e) => dayKey(e.createdAt) === refKey)
    .map((e) => ({ ...e, hour: formatHour(e.createdAt) }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

// Grille calendaire pour un mois donne
// Retourne { weeks: [[cell, ...], ...], monthLabel } ou cell = { day, inMonth, isToday, episodes }
export function buildCalendarGrid(episodes, year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // lundi = 0

  const byDay = {}
  episodes.forEach((e) => {
    const d = new Date(e.createdAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const k = d.getDate()
      if (!byDay[k]) byDay[k] = []
      byDay[k].push({ ...e, hour: formatHour(e.createdAt) })
    }
  })

  const now = new Date()
  const todayDate = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1

  const weeks = []
  let week = []
  // Jours vides avant le 1er
  for (let i = 0; i < startOffset; i++) {
    week.push({ day: null, inMonth: false, isToday: false, episodes: [] })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push({ day: d, inMonth: true, isToday: d === todayDate, episodes: byDay[d] || [] })
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  // Remplir la dernière semaine
  while (week.length > 0 && week.length < 7) {
    week.push({ day: null, inMonth: false, isToday: false, episodes: [] })
  }
  if (week.length) weeks.push(week)

  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return { weeks, monthLabel: `${months[month]} ${year}` }
}

// Label humain pour une période, decalee de `offset`
export function periodLabel(period, offset = 0) {
  const ref = getRefDate(period, offset)
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

  if (period === 'j') {
    return `${jours[ref.getDay()]} ${ref.getDate()} ${months[ref.getMonth()]} ${ref.getFullYear()}`
  }

  if (period === 's') {
    const monday = new Date(ref)
    const dow = (ref.getDay() + 6) % 7
    monday.setDate(ref.getDate() - dow)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const mLabel = monday.getMonth() === sunday.getMonth()
      ? months[monday.getMonth()]
      : `${months[monday.getMonth()]}–${months[sunday.getMonth()]}`
    return `${monday.getDate()}–${sunday.getDate()} ${mLabel} ${sunday.getFullYear()}`
  }

  if (period === 'm') {
    return `${months[ref.getMonth()]} ${ref.getFullYear()}`
  }

  return `${ref.getFullYear()}`
}
