import { conditions } from './conditions'
// =============================================================
// Mesures (taille, poids) et mode de vie (tabac, alcool, caféine, drogues)
// Définitions partagées par le Profil et le rapport médecin.
//
// Stockage, dans le profil (synchronisé avec le serveur) :
//   heightCm       : nombre | null
//   weightHistory  : [{ date: 'AAAA-MM-JJ', kg: nombre }], une mesure par jour
//   lifestyle      : { tobacco, vaping, alcohol, caffeine, cannabis, otherDrugs,
//                      inReport: { <clé>: booléen } }
// Toutes les réponses sont facultatives ; 'nsp' = « Je préfère ne pas répondre ».
// Données sensibles : réponses par tranches, jamais de détail sur les produits.
// =============================================================

export const HEIGHT_RANGE = [100, 250]
export const WEIGHT_RANGE = [20, 350]
export const MAX_WEIGHT_ENTRIES = 400

const NSP = { v: 'nsp', label: 'Je préfère ne pas répondre' }

export const LIFESTYLE_ITEMS = [
  { key: 'tobacco', label: 'Tabac', icon: 'ti-smoking', reportDefault: true, options: [
    { v: 'non', label: 'Non-fumeur' }, { v: 'ancien', label: 'Ancien fumeur' },
    { v: 'occasionnel', label: 'Occasionnel' }, { v: 'quotidien', label: 'Quotidien' }, NSP] },
  { key: 'vaping', label: 'Cigarette électronique', icon: 'ti-cloud', reportDefault: true, options: [
    { v: 'non', label: 'Non' }, { v: 'oui', label: 'Oui' }, NSP] },
  { key: 'alcohol', label: 'Alcool', icon: 'ti-glass-full', reportDefault: true, options: [
    { v: 'jamais', label: 'Jamais' }, { v: 'occasionnel', label: 'Occasionnel' },
    { v: 'hebdo', label: 'Chaque semaine' }, { v: 'quotidien', label: 'Chaque jour' }, NSP] },
  { key: 'caffeine', label: 'Café, thé, boissons caféinées', icon: 'ti-coffee', reportDefault: true,
    hint: 'Un déclencheur connu de la migraine.', options: [
      { v: 'aucune', label: 'Aucune' }, { v: '1-2', label: '1 à 2 par jour' }, { v: '3+', label: '3 ou plus par jour' }, NSP] },
  { key: 'cannabis', label: 'Cannabis', icon: 'ti-leaf', reportDefault: false, options: [
    { v: 'jamais', label: 'Jamais' }, { v: 'occasionnel', label: 'Occasionnel' }, { v: 'regulier', label: 'Régulier' }, NSP] },
  { key: 'otherDrugs', label: 'Autres drogues', icon: 'ti-pill', reportDefault: false,
    hint: 'Sans préciser lesquelles.', options: [
      { v: 'non', label: 'Non' }, { v: 'oui', label: 'Oui' }, NSP] },
]

export function isInReport(profile, key) {
  const flag = profile.lifestyle?.inReport?.[key]
  if (typeof flag === 'boolean') return flag
  return LIFESTYLE_ITEMS.find((i) => i.key === key)?.reportDefault ?? false
}

// Réponses à afficher dans le rapport médecin (répondues, hors « ne pas répondre », autorisées)
export function lifestyleForReport(profile) {
  const ls = profile.lifestyle || {}
  return LIFESTYLE_ITEMS
    .filter((item) => ls[item.key] && ls[item.key] !== 'nsp' && isInReport(profile, item.key))
    .map((item) => ({ label: item.label, value: item.options.find((o) => o.v === ls[item.key])?.label || ls[item.key] }))
}

// ---- Poids ----
export const sortedWeights = (profile) => [...(profile.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date))
export const latestWeight = (profile) => { const w = sortedWeights(profile); return w.length ? w[w.length - 1] : null }

// Ajoute ou remplace la mesure d'un jour ; renvoie le nouvel historique
export function withWeight(profile, date, kg) {
  const rest = (profile.weightHistory || []).filter((w) => w.date !== date)
  return [...rest, { date, kg: Math.round(kg * 10) / 10 }]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_WEIGHT_ENTRIES)
}

// Saisie tolérante : « 64,5 » ou « 64.5 »
export function parseDecimal(text) {
  const v = Number(String(text).trim().replace(',', '.'))
  return Number.isFinite(v) ? v : NaN
}

export const formatKg = (kg) => `${String(kg).replace('.', ',')} kg`

// IMC : uniquement pour le rapport médecin (pas d'étiquette de catégorie)
export function bmi(heightCm, kg) {
  if (!heightCm || !kg) return null
  const m = heightCm / 100
  return Math.round((kg / (m * m)) * 10) / 10
}

// =============================================================
// Mes traitements : médicaments personnels de l'utilisateur
// profile.myTreatments = [{ id, name, dose, frequency, inReport }]
//   frequency : 'quotidien' | 'hebdo' | 'crise' | null
// Ils apparaissent en boutons dans la saisie et « Noter vite », avant les
// suggestions liées à la pathologie ; ils se suppriment depuis le profil ou
// via « Gérer » dans la saisie.
// =============================================================

export const TREATMENT_NAME_MAX = 60
export const MAX_MY_TREATMENTS = 30
export const TREATMENT_FREQUENCIES = [
  { v: 'quotidien', label: 'Chaque jour' },
  { v: 'hebdo', label: 'Plusieurs fois par semaine' },
  { v: 'crise', label: 'En cas de crise' },
]

export const myTreatments = (profile) => (profile.myTreatments || []).filter((t) => t && t.name)
const norm = (s) => s.trim().toLowerCase()

// Suggestions de noms (autocomplétion) : traitements connus des pathologies
export const knownTreatmentNames = () =>
  [...new Set(Object.values(conditions).flatMap((c) => c.treatment || []))].filter((t) => t !== 'Médicament').sort((a, b) => a.localeCompare(b, 'fr'))

// Ajoute un traitement ; renvoie { list, item, error }
export function addMyTreatment(profile, name, extra = {}) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, TREATMENT_NAME_MAX)
  const list = myTreatments(profile)
  if (!clean) return { list, error: 'Indique le nom du médicament' }
  if (norm(clean) === 'aucun') return { list, error: 'Choisis un autre nom' }
  const existing = list.find((t) => norm(t.name) === norm(clean))
  if (existing) return { list, item: existing, duplicate: true }
  if (list.length >= MAX_MY_TREATMENTS) return { list, error: `${MAX_MY_TREATMENTS} traitements au maximum` }
  const item = { id: crypto.randomUUID(), name: clean, dose: '', frequency: null, inReport: true, ...extra }
  return { list: [...list, item], item }
}

// Libellé pour le rapport : « Propranolol 40 mg, chaque jour »
export function treatmentsForReport(profile) {
  return myTreatments(profile)
    .filter((t) => t.inReport !== false)
    .map((t) => {
      const freq = TREATMENT_FREQUENCIES.find((f) => f.v === t.frequency)?.label.toLowerCase()
      return [t.dose ? `${t.name} ${t.dose}` : t.name, freq].filter(Boolean).join(', ')
    })
}
