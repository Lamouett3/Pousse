// Durée d'un épisode : calcul partagé par la saisie, l'accueil, l'historique et le rapport.
const pad = (n) => String(n).padStart(2, '0')

// Catégorie historique ('<1h', '2-4h', '½ jour', '+1j') à partir d'une durée
// réelle en minutes, pour rester compatible avec les statistiques existantes.
export function durationCategory(minutes) {
  if (minutes == null) return ''
  if (minutes < 60) return '<1h'
  if (minutes < 4 * 60) return '2-4h'
  if (minutes < 12 * 60) return '½ jour'
  return '+1j'
}

// « 45 min », « 2 h 30 », « 3 jours »
export function formatDuration(minutes) {
  if (minutes == null) return ''
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60)
  if (h >= 48) return `${Math.round(h / 24)} jours`
  return m ? `${h} h ${pad(m)}` : `${h} h`
}

// Clôture d'une crise en cours : champs à enregistrer
export function endEpisodePatch(ep, end = new Date()) {
  const minutes = Math.max(0, Math.round((end - new Date(ep.createdAt)) / 60000))
  return { ongoing: false, endedAt: end.toISOString(), durationMinutes: minutes, duration: durationCategory(minutes) }
}
