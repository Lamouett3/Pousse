// =============================================================
// Jardin — Design tokens
// Source de vérité unique pour toute la direction artistique.
//
// Depuis la refonte UI, les couleurs de l'interface sont des variables CSS
// (`var(--…)`) générées à partir de deux palettes : `jour` et `nuit`.
// Les composants continuent d'écrire `colors.green.primary` comme avant :
// le thème change sans toucher au code des écrans.
//
// Exceptions volontaires :
//   - Le rapport médecin suit le thème à l'écran, mais s'imprime toujours
//     en clair (bloc @media print généré par themeCss).
//   - `palette.*` expose les valeurs brutes (utile pour du SVG ou des calculs).
// =============================================================

// ---- Palettes brutes ----------------------------------------------------
// Chaque clé « groupe.nom » devient la variable CSS --groupe-nom.
// Les contrastes texte/fond visent 4,5:1 minimum (WCAG AA).
export const palette = {
  jour: {
    'green.pageBg': '#D9E3DA',
    'green.bg': '#E7EFE8',
    'green.surface': '#FBFBF6',
    'green.soft': '#EEF4EF',
    'green.softer': '#E1EEE3',
    'green.primary': '#4F7757',      // était #5A8262 (blanc dessus : 4,37 → 5,11)
    'green.primaryDark': '#3F6B49',
    'green.leaf': '#7FB089',
    'green.leafLight': '#B8D6BD',
    'green.leafFaint': '#DCEADF',
    'text.title': '#2E4034',
    'text.body': '#3A4A3E',
    'text.muted': '#5A6B5E',
    'text.soft': '#667769',          // était #7A8B7E (3,48 → 4,59)
    'text.faint': '#667769',         // était #9DAFA1 (2,23) — fusionné avec soft
    'amber.bg': '#FBF1DA',
    'amber.border': '#E9B85E',
    'amber.text': '#855F24',         // était #9A6F2E (3,99 → 5,11)
    'amber.bar': '#E9B85E',
    'coral.barStrong': '#B0643A',    // plus sombre : se distingue aussi en luminosité
    'pink.bg': '#F3C8D2',
    'pink.border': '#D4537E',
    'pink.soft': '#FDF0F3',
    'pink.text': '#9A3D5E',
    'sand.bg': '#F3F0E9',
    'sand.text': '#716C5E',          // était #8A8576 (3,24 → 4,60)
    'sand.faint': '#A8A294',
    'info.bg': '#F0F4F7',
    'info.text': '#2B4A7A',
    'info.accent': '#2E5BC4',
    'border.soft': '#D6E0D8',
    'border.leaf': '#7FB089',
    'on.primary': '#FFFFFF',         // texte posé sur un fond `green.primary`
    'heat.none': '#B7C4B9',          // contour pointillé « pas de saisie »
    'heat.calm': '#DCEADF',
    'heat.calmText': '#2E4034',
    'heat.light': '#F2D595',
    'heat.lightText': '#4A3510',
    'heat.moderate': '#E9B85E',
    'heat.moderateText': '#3A2A0C',
    'heat.strong': '#B0643A',
    'heat.strongText': '#FFFFFF',
    'overlay.scrim': 'rgba(18, 27, 21, 0.45)',
    'danger.bg': '#FDF5F3',
    'clinical.bg': '#ECEEEA',
    'clinical.surface': '#FFFFFF',
    'clinical.border': '#E0E2DD',
    'clinical.surfaceSoft': '#F4F6F2',
    'clinical.ink': '#1F2A22',
    'toggle.off': '#8A8F89',
    'danger.border': '#E8C0B8',
    'danger.text': '#A04030',
  },
  // « Jardin de nuit » : lumière réduite pour les jours de migraine ou le soir.
  // Pas de blanc pur, pas de vert saturé.
  nuit: {
    'green.pageBg': '#121B15',
    'green.bg': '#16201A',
    'green.surface': '#1A251E',
    'green.soft': '#213028',
    'green.softer': '#2C4535',
    'green.primary': '#8FBF98',
    'green.primaryDark': '#A9CFB0',
    'green.leaf': '#6E9A78',
    'green.leafLight': '#557A5F',
    'green.leafFaint': '#26352B',
    'text.title': '#E3ECE4',
    'text.body': '#C9D6CC',
    'text.muted': '#A3B3A7',
    'text.soft': '#8FA093',
    'text.faint': '#8FA093',
    'amber.bg': '#2E2718',
    'amber.border': '#B39556',
    'amber.text': '#E9C27A',
    'amber.bar': '#D9A94E',
    'coral.barStrong': '#D98A5A',
    'pink.bg': '#3A2530',
    'pink.border': '#D4537E',
    'pink.soft': '#3A2530',
    'pink.text': '#F0A9C0',
    'sand.bg': '#1F2A22',
    'sand.text': '#B5AE9C',
    'sand.faint': '#8F8A7C',
    'info.bg': '#1C2633',
    'info.text': '#A9C4EA',
    'info.accent': '#7FA6F0',
    'border.soft': '#33453A',
    'border.leaf': '#6E9A78',
    'on.primary': '#13201A',
    'heat.none': '#4A5E50',
    'heat.calm': '#2C4535',
    'heat.calmText': '#E3ECE4',
    'heat.light': '#6B5530',
    'heat.lightText': '#F1E3C0',
    'heat.moderate': '#B39556',
    'heat.moderateText': '#13201A',
    'heat.strong': '#D98A5A',
    'heat.strongText': '#13201A',
    'overlay.scrim': 'rgba(0, 0, 0, 0.55)',
    'danger.bg': '#3A2320',
    'clinical.bg': '#16201A',
    'clinical.surface': '#1A251E',
    'clinical.border': '#33453A',
    'clinical.surfaceSoft': '#213028',
    'clinical.ink': '#E3ECE4',
    'toggle.off': '#59605A',
    'danger.border': '#6B3A30',
    'danger.text': '#F0A090',
  },
}

const cssVarName = (key) => `--${key.replace('.', '-')}`
const v = (key) => `var(${cssVarName(key)})`

// Feuille de style des deux thèmes, injectée une fois au démarrage (main.jsx).
// `[data-theme="jour"]` permet aussi de forcer le thème clair sur une zone
// (ex. le rapport médecin), même quand l'app est en mode nuit.
export function themeCss() {
  const block = (name) => Object.entries(palette[name])
    .map(([k, val]) => `  ${cssVarName(k)}: ${val};`).join('\n')
  // Impression / PDF : toujours la palette claire, quel que soit le thème
  return `:root, [data-theme="jour"] {\n  color-scheme: light;\n${block('jour')}\n}\n[data-theme="nuit"] {\n  color-scheme: dark;\n${block('nuit')}\n}\n@media print {\n  :root, [data-theme="jour"], [data-theme="nuit"] {\n  color-scheme: light;\n${block('jour')}\n  }\n}\n`
}

// Transparence sur une couleur de token (remplace l'ancien `${couleur}33`,
// qui ne fonctionne pas avec des variables CSS).
export const alpha = (color, percent) => `color-mix(in srgb, ${color} ${percent}%, transparent)`

// ---- Couleurs utilisées par les composants (mêmes noms qu'avant) ----------
export const colors = {
  green: {
    pageBg: v('green.pageBg'),
    bg: v('green.bg'),
    surface: v('green.surface'),
    soft: v('green.soft'),
    softer: v('green.softer'),
    primary: v('green.primary'),
    primaryDark: v('green.primaryDark'),
    leaf: v('green.leaf'),
    leafLight: v('green.leafLight'),
    leafFaint: v('green.leafFaint'),
  },
  text: {
    title: v('text.title'),
    body: v('text.body'),
    muted: v('text.muted'),
    soft: v('text.soft'),
    faint: v('text.faint'),
  },
  amber: {
    bg: v('amber.bg'),
    border: v('amber.border'),
    text: v('amber.text'),
    bar: v('amber.bar'),
  },
  coral: {
    barStrong: v('coral.barStrong'),
  },
  pink: {
    bg: v('pink.bg'),
    border: v('pink.border'),
    soft: v('pink.soft'),
    text: v('pink.text'),
  },
  sand: {
    bg: v('sand.bg'),
    text: v('sand.text'),
    faint: v('sand.faint'),
  },
  info: {
    bg: v('info.bg'),
    text: v('info.text'),
    accent: v('info.accent'),
  },
  border: {
    soft: v('border.soft'),
    leaf: v('border.leaf'),
  },
  // Texte sur fond d'action (blanc le jour, vert très sombre la nuit)
  onPrimary: v('on.primary'),
  // Calendrier de chaleur (historique)
  heat: {
    none: v('heat.none'),
    calm: v('heat.calm'), calmText: v('heat.calmText'),
    light: v('heat.light'), lightText: v('heat.lightText'),
    moderate: v('heat.moderate'), moderateText: v('heat.moderateText'),
    strong: v('heat.strong'), strongText: v('heat.strongText'),
  },
  overlay: {
    scrim: v('overlay.scrim'),
  },
  // Interrupteur désactivé : gris neutre (≥ 3:1 sur la surface), jamais vert
  toggleOff: v('toggle.off'),
  // Actions destructrices (supprimer)
  danger: {
    bg: v('danger.bg'),
    border: v('danger.border'),
    text: v('danger.text'),
  },
  // Rapport médecin — registre clinique sobre. Suit le thème à l'écran ;
  // à l'impression et en PDF, la palette claire est toujours imposée (themeCss).
  clinical: {
    bg: v('clinical.bg'),
    surface: v('clinical.surface'),
    border: v('clinical.border'),
    surfaceSoft: v('clinical.surfaceSoft'),
    ink: v('clinical.ink'),
  },
}

// ---- Échelle typographique ------------------------------------------------
// 7 niveaux au lieu de 25 tailles. 12 px est un plancher absolu.
export const type = {
  xs: 12,       // mentions, légendes
  sm: 13,       // libellés de champ
  base: 15,     // texte courant, chips
  md: 17,       // titres de carte, bouton principal
  lg: 20,       // titres de section
  xl: 26,       // titres d'écran
  display: 34,  // accueil, grands chiffres
}

// ---- Rayons : 3 niveaux liés à la hiérarchie ------------------------------
// Les anciens noms sont conservés et pointent vers ces 3 valeurs.
const R_SMALL = '12px'   // chips, champs, petits boutons
const R_CARD = '20px'    // cartes, bouton principal
const R_SCREEN = '28px'  // écran, feuilles modales
export const radius = {
  sm: R_SMALL,
  md: R_SMALL,
  lg: R_CARD,
  xl: R_CARD,
  card: R_SCREEN,
  pill: R_SMALL,
  small: R_SMALL,
  screen: R_SCREEN,
}

// ---- Ombres teintées de vert (plus chaudes que le gris neutre) -------------
const ink = (a) => `rgba(46, 64, 52, ${a})`
export const shadow = {
  xs: `0 1px 2px ${ink(0.06)}`,
  sm: `0 1px 3px ${ink(0.08)}, 0 2px 6px ${ink(0.05)}`,
  md: `0 1px 3px ${ink(0.08)}, 0 6px 16px ${ink(0.06)}`,
  lg: `0 2px 6px ${ink(0.08)}, 0 10px 24px ${ink(0.08)}`,
  xl: `0 4px 12px ${ink(0.1)}, 0 16px 40px ${ink(0.12)}`,
  button: `0 1px 3px ${ink(0.12)}, 0 6px 16px ${ink(0.14)}`,
  buttonHover: `0 2px 6px ${ink(0.14)}, 0 10px 22px ${ink(0.16)}`,
  card: `0 1px 3px ${ink(0.06)}, 0 0 0 0.5px ${ink(0.04)}`,
  nav: `0 -2px 14px ${ink(0.08)}`,
  sidebar: `2px 0 14px ${ink(0.05)}`,
}

export const spacing = {
  xs: '6px',
  sm: '8px',
  md: '14px',
  lg: '18px',
  xl: '22px',
}

export const font = {
  family: "'Nunito Variable', 'Nunito', system-ui, -apple-system, sans-serif",
  // Police d'accent — titres, mot-marque, grands chiffres. Registre
  // « herbier botanique ». À utiliser avec parcimonie.
  display: "'Fraunces Variable', 'Fraunces', Georgia, 'Times New Roman', serif",
}

// Taille minimale d'une zone tactile (WCAG 2.5.5 / recommandations iOS)
export const TOUCH_MIN = 44

// --- Responsive layout tokens ---

// Largeur max des conteneurs par breakpoint
export const CONTAINER = {
  mobile: 480,
  tablet: 960,
  desktop: 1120,
}

// Padding interne des écrans par breakpoint
export const SCREEN_PADDING = {
  mobile: '20px 16px 22px',
  tablet: '22px 20px 26px',
  desktop: '28px 32px 32px',
}

// Hauteur de la barre de navigation par breakpoint
export const NAV_HEIGHT = {
  mobile: 64,
  tablet: 70,
  desktop: 0, // sidebar, pas de barre en bas
}
