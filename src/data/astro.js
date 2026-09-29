// =============================================================
// Calculs astronomiques simplifies — positions planétaires & lune
// Elements orbitaux moyens J2000.0 (1er janvier 2000, 12h TT).
// Precision : quelques degres — suffisant pour un schema.
// =============================================================

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)

function daysSinceJ2000(date) {
  return (date.getTime() - J2000) / 86400000
}

// Période synodique moyenne de la Lune (jours)
export const SYNODIC_MONTH = 29.53059

// Phase connue : nouvelle lune du 6 janvier 2000 (epoch de reference)
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0)

/**
 * Phase lunaire en fraction 0..1.
 * 0 = nouvelle lune, ~0.5 = pleine lune, ~1 = retour nouvelle lune.
 */
export function getMoonPhase(date = new Date()) {
  const daysSinceRef = (date.getTime() - KNOWN_NEW_MOON) / 86400000
  const phase = ((daysSinceRef / SYNODIC_MONTH) % 1 + 1) % 1
  return phase
}

const PHASE_NAMES = [
  { max: 0.0375, label: 'Nouvelle lune',        icon: 'new',             description: 'Temps de repos et d\'intentions' },
  { max: 0.2125, label: 'Premier croissant',     icon: 'waxing-crescent', description: 'Énergie de lancement et de nouveaux départs' },
  { max: 0.2875, label: 'Premier quartier',      icon: 'first-quarter',   description: 'Moment de décisions et d\'action' },
  { max: 0.4625, label: 'Gibbeuse croissante',   icon: 'waxing-gibbous',  description: 'Affiner, ajuster, persévérer' },
  { max: 0.5375, label: 'Pleine lune',           icon: 'full',            description: 'Énergie d\'accomplissement et de célébration' },
  { max: 0.7125, label: 'Gibbeuse décroissante', icon: 'waning-gibbous',  description: 'Gratitude et partage' },
  { max: 0.7875, label: 'Dernier quartier',      icon: 'last-quarter',    description: 'Lâcher prise et bilan' },
  { max: 0.9625, label: 'Dernier croissant',     icon: 'waning-crescent', description: 'Repos, introspection, préparation' },
  { max: 1.0,    label: 'Nouvelle lune',         icon: 'new',             description: 'Temps de repos et d\'intentions' },
]

/**
 * Nom de la phase lunaire en francais + type d'icone.
 */
export function getMoonPhaseName(date = new Date()) {
  const p = getMoonPhase(date)
  for (const entry of PHASE_NAMES) {
    if (p <= entry.max) return { label: entry.label, icon: entry.icon, description: entry.description }
  }
  return { label: PHASE_NAMES[0].label, icon: PHASE_NAMES[0].icon, description: PHASE_NAMES[0].description }
}

// 8 phases discrètes pour corrélations statistiques et visualisations
export const MOON_PHASES_8 = [
  { key: 'nouvelle', label: 'Nouvelle lune', min: 0, max: 0.125, icon: 'ti-circle', color: '#5A6B5E' },
  { key: 'croissant1', label: 'Premier croissant', min: 0.125, max: 0.25, icon: 'ti-moon', color: '#9FC4A4' },
  { key: 'quartier1', label: 'Premier quartier', min: 0.25, max: 0.375, icon: 'ti-circle-half-vertical', color: '#B8AFA0' },
  { key: 'gibbeuse_c', label: 'Gibbeuse croissante', min: 0.375, max: 0.5, icon: 'ti-moon-filled', color: '#C4B17C' },
  { key: 'pleine', label: 'Pleine lune', min: 0.5, max: 0.625, icon: 'ti-circle-filled', color: '#FFFDE7' },
  { key: 'gibbeuse_d', label: 'Gibbeuse décroissante', min: 0.625, max: 0.75, icon: 'ti-moon-filled', color: '#C4B17C' },
  { key: 'quartier3', label: 'Dernier quartier', min: 0.75, max: 0.875, icon: 'ti-circle-half-vertical', color: '#B8AFA0' },
  { key: 'croissant3', label: 'Dernier croissant', min: 0.875, max: 1.0, icon: 'ti-moon', color: '#9FC4A4' },
]

export function getMoonPhaseIndex(phase) {
  for (let i = 0; i < MOON_PHASES_8.length; i++) {
    if (phase < MOON_PHASES_8[i].max) return i
  }
  return 0
}
