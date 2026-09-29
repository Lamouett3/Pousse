// =============================================================
// Modules de pathologies
// Chaque pathologie réutilise le même squelette d'épisode
// (quand / où / intensité / durée / déclencheurs / traitement).
// Seuls le vocabulaire et les "briques" spécifiques changent.
// Pour ajouter une pathologie : ajouter une entrée ici, rien d'autre.
// =============================================================

export const conditions = {
  migraine: {
    label: 'Migraine',
    icon: 'ti-brain',
    zones: ['tete'],
    triggers: ['Sommeil', 'Stress', 'Règles', 'Aliment', 'Météo', 'Écran'],
    treatment: ['Triptan', 'Paracétamol', 'Ibuprofène'],
    extra: {
      label: 'Symptômes associés',
      options: ['Aura', 'Nausée', 'Photophobie'],
    },
  },
  maux_de_tete: {
    label: 'Maux de tête',
    icon: 'ti-mood-sick',
    zones: ['tete'],
    triggers: ['Stress', 'Fatigue', 'Écran', 'Déshydratation', 'Sommeil', 'Météo'],
    treatment: ['Paracétamol', 'Ibuprofène'],
    extra: {
      label: 'Type de douleur',
      options: ['Tension', 'Pression', 'Pulsatile', 'En étau'],
    },
  },
  sii: {
    label: 'SII',
    icon: 'ti-spiral',
    zones: ['abdomen'],
    triggers: ['Aliment gras', 'Stress', 'Lactose', 'Gluten', 'Caféine'],
    treatment: ['Antispasmodique', 'Lopéramide'],
    extra: {
      label: 'Selles (échelle de Bristol)',
      options: ['Dure', 'Normale', 'Molle', 'Liquide'],
    },
  },
  fibro: {
    label: 'Fibromyalgie',
    icon: 'ti-ripple',
    zones: ['torse', 'brasG', 'brasD', 'jambeG', 'jambeD'],
    triggers: ['Sommeil', 'Stress', 'Effort', 'Froid'],
    treatment: ['Antalgique', 'Prégabaline'],
    extra: {
      label: 'Autres',
      options: ['Raideur matinale', 'Fatigue intense'],
    },
  },
  endometriose: {
    label: 'Endométriose',
    icon: 'ti-droplet-half-2',
    zones: ['abdomen'],
    triggers: ['Règles', 'Stress', 'Effort', 'Rapports'],
    treatment: ['Antalgique', 'AINS'],
    extra: {
      label: 'Symptômes associés',
      options: ['Crampes', 'Nausée', 'Fatigue', 'Saignements anormaux'],
    },
  },
  eczema: {
    label: 'Eczéma',
    icon: 'ti-hand-finger',
    zones: ['brasG', 'brasD', 'jambeG', 'jambeD', 'torse'],
    triggers: ['Stress', 'Allergene', 'Chaleur', 'Produit chimique', 'Aliment'],
    treatment: ['Corticoïde local', 'Émollient'],
    extra: {
      label: 'Aspect',
      options: ['Plaques rouges', 'Suintement', 'Croutes', 'Secheresse'],
    },
  },
  asthme: {
    label: 'Asthme',
    icon: 'ti-lungs',
    zones: ['torse'],
    triggers: ['Effort', 'Allergene', 'Froid', 'Pollution', 'Stress'],
    treatment: ['Bronchodilatateur', 'Corticoïde inhalé'],
    extra: {
      label: 'Symptômes',
      options: ['Sifflement', 'Toux seche', 'Oppression', 'Essoufflement'],
    },
  },
  arthrose: {
    label: 'Arthrose',
    icon: 'ti-bone',
    zones: ['jambeG', 'jambeD', 'brasG', 'brasD'],
    triggers: ['Effort', 'Froid', 'Humidite', 'Immobilite prolongee'],
    treatment: ['Anti-inflammatoire', 'Paracétamol'],
    extra: {
      label: 'Symptômes',
      options: ['Raideur', 'Gonflement', 'Craquements', 'Perte de mobilite'],
    },
  },
  autre: {
    label: 'Autre pathologie',
    icon: 'ti-pencil',
    zones: ['tete', 'torse', 'abdomen', 'brasG', 'brasD', 'jambeG', 'jambeD'],
    triggers: ['Stress', 'Sommeil', 'Effort', 'Aliment', 'Météo', 'Froid'],
    treatment: ['Médicament'],
    extra: {
      label: 'Precision',
      options: [],
    },
    custom: true, // signale qu'un champ libre est propose
  },
}

// Map condition key → icon class (rétrocompatibilité)
export const COND_ICONS = Object.fromEntries(
  Object.entries(conditions).map(([k, v]) => [k, v.icon])
)

export const conditionKeys = Object.keys(conditions)

// Noms lisibles des zones du corps
export const zoneLabels = {
  tete: 'Tête',
  torse: 'Torse',
  abdomen: 'Abdomen',
  brasG: 'Bras gauche',
  brasD: 'Bras droit',
  jambeG: 'Jambe gauche',
  jambeD: 'Jambe droite',
}

// Déclencheurs lies au genre — masques pour certains profils
export const genderFilteredTriggers = {
  h: ['Règles', 'Rapports'],
}

// Niveaux d'efficacité du traitement (renseignés en second temps)
export const efficacyLevels = ['Pas encore', 'Un peu', 'Bien']

// Durées proposées
export const durations = ['<1h', '2-4h', '½ jour', '+1j']

// =============================================================
// Pathologies personnelles (profile.customConditions)
// [{ id: 'perso-…', label, icon, accent, archived }]
// Elles sont ajoutées à `conditions` et `conditionKeys` (registre partagé),
// si bien que l'historique, les statistiques et le rapport les reconnaissent
// comme les pathologies intégrées. Une pathologie supprimée alors que des
// épisodes l'utilisent est seulement archivée : elle disparaît des choix,
// mais son nom reste affiché dans l'historique et le rapport.
// =============================================================
const BUILTIN_KEYS = [...conditionKeys]
export const MAX_CUSTOM_CONDITIONS = 20
export const CUSTOM_LABEL_MAX = 40
export const CUSTOM_ICONS = ['ti-heart-rate-monitor', 'ti-activity', 'ti-bone', 'ti-eye', 'ti-ear', 'ti-droplet', 'ti-flame', 'ti-mood-sad']
export const CUSTOM_ACCENTS = ['#6B7FB5', '#B5774F', '#4F8F6A', '#9A5F96', '#8A7F3A', '#4F86A8']
const CUSTOM_TRIGGERS = ['Stress', 'Sommeil', 'Effort', 'Aliment', 'Météo', 'Écrans', 'Alcool', 'Froid']
const CUSTOM_EXTRA = ['Fatigue', 'Nausée', 'Vertiges', 'Douleur diffuse', 'Troubles du sommeil']

export const isCustomCondition = (key) => typeof key === 'string' && key.startsWith('perso-')

export function registerCustomConditions(list) {
  // Retire les pathologies personnelles précédemment enregistrées
  for (const k of Object.keys(conditions)) if (!BUILTIN_KEYS.includes(k)) delete conditions[k]
  conditionKeys.splice(0, conditionKeys.length, ...BUILTIN_KEYS)
  for (const c of list || []) {
    if (!c || !isCustomCondition(c.id) || !c.label) continue
    conditions[c.id] = {
      label: c.label,
      icon: c.icon || CUSTOM_ICONS[0],
      accent: c.accent || CUSTOM_ACCENTS[0],
      zones: [],
      triggers: CUSTOM_TRIGGERS,
      treatment: [],
      extra: { label: 'Symptômes associés', options: CUSTOM_EXTRA },
      userDefined: true,
      archived: !!c.archived,
    }
    conditionKeys.push(c.id)
  }
}

// Pathologies proposées au choix : intégrées (sauf l'ancienne « Autre ») et personnelles actives
export const isSelectableCondition = (key) => !!conditions[key] && key !== 'autre' && !conditions[key].archived

export const activeCustomConditions = (profile) => (profile.customConditions || []).filter((c) => c && !c.archived)

const norm = (s) => String(s).trim().toLowerCase()

// Création : renvoie { patch, id } ou { error }
export function addCustomConditionPatch(profile, label, icon) {
  const clean = String(label || '').trim().replace(/\s+/g, ' ').slice(0, CUSTOM_LABEL_MAX)
  if (!clean) return { error: 'Indique le nom de la pathologie' }
  const list = profile.customConditions || []
  const taken = [...BUILTIN_KEYS.map((k) => conditions[k]?.label), ...list.filter((c) => !c.archived).map((c) => c.label)]
  if (taken.some((l) => l && norm(l) === norm(clean))) return { error: `« ${clean} » existe déjà dans la liste` }
  // Recréer une pathologie archivée du même nom la réactive (ses épisodes la retrouvent)
  const archived = list.find((c) => c.archived && norm(c.label) === norm(clean))
  if (archived) {
    return { id: archived.id, patch: { customConditions: list.map((c) => (c.id === archived.id ? { ...c, archived: false, icon: icon || c.icon } : c)) } }
  }
  if (list.filter((c) => !c.archived).length >= MAX_CUSTOM_CONDITIONS) return { error: `${MAX_CUSTOM_CONDITIONS} pathologies personnelles au maximum` }
  const id = `perso-${crypto.randomUUID().slice(0, 8)}`
  const accent = CUSTOM_ACCENTS[list.length % CUSTOM_ACCENTS.length]
  return { id, patch: { customConditions: [...list, { id, label: clean, icon: icon || CUSTOM_ICONS[0], accent, archived: false }] } }
}

// Suppression : archivée si des épisodes l'utilisent, sinon retirée
export function removeCustomConditionPatch(profile, id, episodes = []) {
  const used = episodes.some((e) => e.condition === id)
  const list = profile.customConditions || []
  const next = used ? list.map((c) => (c.id === id ? { ...c, archived: true } : c)) : list.filter((c) => c.id !== id)
  const favorites = (profile.quickFavorites || []).filter((k) => k !== id)
  return { customConditions: next, quickFavorites: favorites }
}
