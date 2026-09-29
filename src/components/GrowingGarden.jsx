// =============================================================
// GrowingGarden — le jardin qui pousse
//
// Animations : croissance organique, balancement au vent,
// respiration lumineuse, particules de pollen, papillon,
// herbe animée, progression bourgeon → bouton → fleur.
// Maturation naturelle : chaque plante évolue jour après jour
// (bourgeon → bouton le lendemain → fleur J+2).
// Décor météo dynamique via géolocalisation + Open-Météo.
// Ciel dynamique (heure du jour), sol enrichi, faune progressive.
// Récompenses jour 7 : essaim d'abeilles + papillon doré.
// Props : days (nombre de jours distincts signalés)
// =============================================================

import { useState, useEffect, useRef } from 'react'
import GardenFauna from './garden/GardenFauna'
import { fetchWeather } from '../data/weather'
import { getMoonPhase } from '../data/astro'

// Palette alignee sur les tokens DA (src/theme/tokens.js)
// Toutes les teintes derivent des verts, ambre, rose, corail, sable du design system.
const C = {
  // Tiges — verts d'identite DA
  stem: '#4F7757',       // tiges plus soutenues (se détachent du sol vert)
  stemDark: '#3F6B49',   // colors.green.primaryDark
  // Feuilles
  leafDark: '#3F6B49',   // colors.green.primaryDark
  leafLight: '#5A8262',
  // Sol — surfaces DA
  ground: '#A9CFB0',     // colline claire (maquette)
  groundInner: '#8DBF97',// colline (maquette : #7FB089)
  // Herbe
  grass: '#5A8262',
  grassLight: '#7FB089',  // colors.green.leaf
  // Rose — DA pink
  pink: '#F3C8D2',       // colors.pink.bg
  pinkDeep: '#E48FA8',   // rose plus franc
  pinkCore: '#E9B85E',   // colors.amber.border
  pinkBud: '#E8B8C4',
  // Tournesol — DA amber
  yellow: '#F4D58A',     // or doux (maquette)
  yellowDeep: '#E9B85E', // colors.amber.border
  yellowCore: '#9A6F2E', // colors.amber.text
  yellowBud: '#EDD8A0',
  // Tulipe — DA coral
  tulipRed: '#D98A5A',   // colors.coral.barStrong
  tulipRedDeep: '#C47048',
  tulipBud: '#DCA080',
  // Lavande — violet chaud assourdi
  lavender: '#AE98CC',
  lavenderDeep: '#7F68AC',
  lavenderBud: '#C0B0C8',
  // Marguerite — DA surface/sable
  daisy: '#FBFBF6',      // colors.green.surface
  daisyCore: '#E9B85E',  // colors.amber.border
  daisyBud: '#F3F0E9',   // colors.sand.bg
  // Corail — DA coral/amber
  coral: '#D98A5A',      // colors.coral.barStrong
  coralDeep: '#C47048',
  coralCore: '#9A6F2E',  // colors.amber.text
  coralBud: '#DCAA88',
  // Pollen — DA amber
  pollen: '#E9B85E',     // colors.amber.border
  // Papillon — lavande chaude
  butterfly: '#9080A8',
  butterflyWing: '#C8B8D8',
  // Abeille — DA amber
  bee: '#E9B85E',        // colors.amber.border
  beeWing: '#FBF1DA',    // colors.amber.bg
  // Eclats — DA surface
  sparkle: '#FBFBF6',    // colors.green.surface
}

const WIND = [
  { dur: '3.2s', delay: '0s', angle: 6 },
  { dur: '3.8s', delay: '0.4s', angle: 7 },
  { dur: '3.0s', delay: '0.9s', angle: 5 },
  { dur: '3.5s', delay: '0.2s', angle: 7.5 },
  { dur: '4.0s', delay: '0.7s', angle: 5.5 },
  { dur: '3.3s', delay: '1.1s', angle: 6.5 },
  { dur: '3.6s', delay: '0.3s', angle: 4.5 },
]

const GRASS_POS = [
  { x: 15, h: 6, l: -2.2 }, { x: 28, h: 4.5, l: 1.5 },
  { x: 52, h: 5, l: -1.2 }, { x: 78, h: 6.5, l: 1.8 },
  { x: 105, h: 5, l: -1.8 }, { x: 128, h: 5.5, l: 1.3 },
  { x: 155, h: 6, l: -1.6 }, { x: 175, h: 4.5, l: 2 },
  { x: 200, h: 5.5, l: -1 }, { x: 225, h: 6, l: 1.5 },
  { x: 248, h: 5, l: -2 }, { x: 270, h: 5.5, l: 1.2 },
  { x: 285, h: 4.5, l: -1.5 },
]

const POLLEN_CFG = [
  { x: 55, delay: '0s', dur: '9s', drift: 8 },
  { x: 110, delay: '2.5s', dur: '11s', drift: -6 },
  { x: 170, delay: '5s', dur: '8s', drift: 10 },
  { x: 220, delay: '1.5s', dur: '10s', drift: -8 },
  { x: 85, delay: '4s', dur: '12s', drift: 5 },
  { x: 140, delay: '6.5s', dur: '10s', drift: -5 },
  { x: 250, delay: '3s', dur: '9s', drift: 7 },
]

const EXTRA_POLLEN_CFG = [
  { x: 30, delay: '1s', dur: '10s', drift: 6 },
  { x: 200, delay: '3.5s', dur: '8.5s', drift: -7 },
  { x: 130, delay: '0.5s', dur: '11.5s', drift: 9 },
  { x: 260, delay: '2s', dur: '9.5s', drift: -5 },
  { x: 70, delay: '5.5s', dur: '10.5s', drift: 4 },
  { x: 180, delay: '4.5s', dur: '7.5s', drift: -8 },
  { x: 240, delay: '1.5s', dur: '12s', drift: 6 },
]

const SVG_STYLE = `
.pg-plant{transform-box:fill-box;transform-origin:center bottom;animation:pgGrow .9s cubic-bezier(.34,1.56,.64,1) both}
@keyframes pgGrow{0%{transform:scaleY(0);opacity:0}40%{opacity:1}100%{transform:scaleY(1)}}
.pg-bloom{transform-box:fill-box;transform-origin:center center;animation:pgBloom 1.2s cubic-bezier(.34,1.56,.64,1) both;animation-delay:var(--bloom-delay,0s)}
@keyframes pgBloom{0%{transform:scale(0);opacity:0}50%{opacity:1}100%{transform:scale(1)}}
.pg-fadein{animation:pgFadeIn 1.5s ease both}
.pg-wiggle{transform-box:fill-box;transform-origin:center bottom;animation:pgWiggle .75s ease 1}
@keyframes pgWiggle{0%,100%{transform:rotate(0)}20%{transform:rotate(-10deg)}45%{transform:rotate(8deg)}70%{transform:rotate(-4deg)}85%{transform:rotate(2deg)}}
/* Rafales : toutes les 18 s, une vague traverse la scène (délai proportionnel à x) */
.pg-gust{transform-box:fill-box;transform-origin:center bottom;animation:pgGust 18s ease-in-out infinite}
@keyframes pgGust{0%,62%,82%,100%{transform:rotate(0)}66%{transform:rotate(9deg)}70%{transform:rotate(-3deg)}74%{transform:rotate(4.5deg)}78%{transform:rotate(-1deg)}}
.pg-streak{animation:pgStreak 18s ease-in-out infinite;opacity:0}
@keyframes pgStreak{0%,57%{transform:translateX(-70px);opacity:0}60%{opacity:.75}71%{transform:translateX(370px);opacity:0}100%{transform:translateX(370px);opacity:0}}
.pg-boing{transform-box:fill-box;transform-origin:center bottom;animation:pgBoing .6s cubic-bezier(.34,1.56,.64,1) 1}
@keyframes pgBoing{0%,100%{transform:scale(1,1)}30%{transform:scale(1.18,.8)}60%{transform:scale(.92,1.12)}}
.pg-puff{transform-box:fill-box;animation:pgPuff .9s ease-out both}
@keyframes pgPuff{0%{transform:translateY(0);opacity:.9}100%{transform:translateY(-14px);opacity:0}}
@keyframes pgFadeIn{0%{opacity:0}100%{opacity:1}}
`

// --- Time of day ---

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h >= 6 && h < 8) return 'dawn'
  if (h >= 8 && h < 18) return 'day'
  if (h >= 18 && h < 20) return 'dusk'
  return 'night'
}

const SKY_GRADIENTS = {
  dawn:  { top: '#C9DAE6', mid: '#F2D6C2', bot: '#F7E6CF' },
  day:   { top: '#C4DDE8', mid: '#DCEBEF', bot: '#EDF5F1' },
  dusk:  { top: '#6F6A92', mid: '#E0A070', bot: '#F2C27A' },
  night: { top: '#141D2B', mid: '#1E2A38', bot: '#2A3A48' },
}

const HILL_COLORS = {
  dawn:  ['#C8DCC6', '#A9CCAE'],
  day:   ['#B8D6BD', '#9CC7A5'],   // colors.green.leafLight (maquette)
  dusk:  ['#8A7A78', '#6E6A70'],
  night: ['#243345', '#1E3A30'],
}

// --- Astres : Soleil & Lune ---

function CelestialSun({ timeOfDay, weather }) {
  const cx = timeOfDay === 'dawn' ? 248 : 260
  const cy = timeOfDay === 'dawn' ? 38 : 22
  const isClear = !weather || weather.type === 'clear'
  const opacity = isClear ? 1 : 0.35
  return (
    <g className="pg-fadein" opacity={opacity}>
      <circle cx={cx} cy={cy} r={14} fill="#FBF1DA" opacity="0.25">
        <animate attributeName="r" values="14;17;14" dur="5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.35;0.18" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={8} fill="#F4D58A" opacity="0.8" />
      <circle cx={cx} cy={cy} r={5} fill="#F0C45E" opacity="0.95" />
      {isClear && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180
        return (
          <line key={a}
            x1={cx + 10 * Math.cos(rad)} y1={cy + 10 * Math.sin(rad)}
            x2={cx + 15 * Math.cos(rad)} y2={cy + 15 * Math.sin(rad)}
            stroke="#E9B85E" strokeWidth="0.6" strokeLinecap="round" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.45;0.2" dur="3s"
              begin={`${a / 360}s`} repeatCount="indefinite" />
          </line>
        )
      })}
    </g>
  )
}

function CelestialMoon({ timeOfDay }) {
  const phase = getMoonPhase()
  const cx = timeOfDay === 'dusk' ? 50 : 40
  const cy = timeOfDay === 'dusk' ? 34 : 22
  const r = 9

  // Illumination : 0 a nouvelle lune, 1 a pleine lune
  const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2
  // Facteur de courbure du terminateur
  const k = -Math.cos(phase * 2 * Math.PI)

  // Nouvelle lune : juste un contour subtil
  if (illum < 0.02) {
    return (
      <g className="pg-fadein">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FBF1DA" strokeWidth="0.4" opacity="0.15" />
      </g>
    )
  }

  // Construction du chemin eclaire via deux arcs
  const waxing = phase <= 0.5
  const tRx = Math.abs(k) * r
  const top = `${cx},${cy - r}`
  const bot = `${cx},${cy + r}`
  let litPath
  if (waxing) {
    const tSweep = k >= 0 ? 0 : 1
    litPath = `M${top} A${r},${r} 0 0,1 ${bot} A${tRx},${r} 0 0,${tSweep} ${top}Z`
  } else {
    const tSweep = k >= 0 ? 1 : 0
    litPath = `M${top} A${r},${r} 0 0,0 ${bot} A${tRx},${r} 0 0,${tSweep} ${top}Z`
  }

  const glowR = r + 2 + illum * 4
  const glowOpacity = 0.04 + illum * 0.14

  return (
    <g className="pg-fadein">
      {/* Halo */}
      <circle cx={cx} cy={cy} r={glowR} fill="#FBF1DA" opacity={glowOpacity}>
        <animate attributeName="opacity" values={`${glowOpacity * 0.7};${glowOpacity};${glowOpacity * 0.7}`}
          dur="6s" repeatCount="indefinite" />
      </circle>
      {/* Base sombre (disque toujours visible) */}
      <circle cx={cx} cy={cy} r={r} fill="#FBF1DA" opacity="0.06" />
      {/* Partie eclairee */}
      <path d={litPath} fill="#FBF1DA" opacity={0.65 + illum * 0.3} />
      {/* Crateres (pleine lune / gibbeuse) */}
      {illum > 0.55 && <>
        <circle cx={cx - 2} cy={cy - 1.5} r={1.3} fill="#E9B85E" opacity={0.08 * illum} />
        <circle cx={cx + 2.5} cy={cy + 2} r={0.9} fill="#E9B85E" opacity={0.06 * illum} />
        <circle cx={cx - 0.5} cy={cy + 3} r={1} fill="#E9B85E" opacity={0.05 * illum} />
      </>}
    </g>
  )
}

// --- Phase 1 : Sky & Atmosphere ---

// Couleurs du sol selon le moment de la journée : la pelouse suit le ciel
// (auparavant elle restait en couleurs de jour, même sous un ciel de nuit).
const GROUND_COLORS = {
  dawn:  { top: '#B4CFAE', mid: '#95BE95', bot: '#84AF88', layer: '#7FA985', moss: '#C4D8BA' },
  day:   { top: '#A9CFB0', mid: '#8DBF97', bot: '#7FB089', layer: '#7FB089', moss: '#B8D6BD' },
  dusk:  { top: '#8FA487', mid: '#7A9574', bot: '#6A8768', layer: '#62805F', moss: '#A2B094' },
  night: { top: '#34503F', mid: '#2C4636', bot: '#253D2F', layer: '#223A2C', moss: '#3E5A48' },
}

function SkyGradientDefs({ timeOfDay }) {
  const g = SKY_GRADIENTS[timeOfDay]
  return (
    <>
      <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={g.top} />
        <stop offset="55%" stopColor={g.mid} />
        <stop offset="100%" stopColor={g.bot} />
      </linearGradient>
      <linearGradient id="ground-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={GROUND_COLORS[timeOfDay].top} />
        <stop offset="60%" stopColor={GROUND_COLORS[timeOfDay].mid} />
        <stop offset="100%" stopColor={GROUND_COLORS[timeOfDay].bot} />
      </linearGradient>
      <radialGradient id="harvest-glow" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stopColor="#E9B85E" stopOpacity="0.18" />
        <stop offset="70%" stopColor="#E9B85E" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#E9B85E" stopOpacity="0" />
      </radialGradient>
    </>
  )
}

function SkyBackground({ timeOfDay }) {
  return <rect x="0" y="0" width="300" height="190" fill="url(#sky-gradient)" />
}

function DistantHills({ timeOfDay }) {
  const cols = HILL_COLORS[timeOfDay]
  return (
    <g className="pg-fadein">
      <path d="M0 140Q40 118 80 130Q120 115 160 128Q200 112 240 125Q280 118 300 132L300 190L0 190Z"
        fill={cols[0]} opacity="0.75" />
      <path d="M0 145Q50 128 100 138Q150 122 200 135Q250 125 300 140L300 190L0 190Z"
        fill={cols[1]} opacity="0.6" />
    </g>
  )
}

function Stars() {
  const stars = [
    { x: 25, y: 12, r: 0.8, d: '0s' }, { x: 68, y: 28, r: 0.6, d: '0.8s' },
    { x: 112, y: 8, r: 0.9, d: '1.5s' }, { x: 155, y: 35, r: 0.5, d: '0.3s' },
    { x: 198, y: 15, r: 0.7, d: '2s' }, { x: 240, y: 42, r: 0.6, d: '1.2s' },
    { x: 278, y: 10, r: 0.8, d: '0.6s' }, { x: 45, y: 50, r: 0.5, d: '1.8s' },
    { x: 130, y: 55, r: 0.7, d: '2.5s' }, { x: 210, y: 60, r: 0.5, d: '0.4s' },
  ]
  return (
    <g className="pg-fadein">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur={`${2.5 + (i % 3) * 0.8}s`}
            begin={s.d} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function Fireflies() {
  const flies = [
    { x: 40, y: 70, dx: 12, dy: -8, dur: '6s', d: '0s' },
    { x: 130, y: 85, dx: -10, dy: -12, dur: '8s', d: '1s' },
    { x: 220, y: 60, dx: 8, dy: 10, dur: '7s', d: '2.5s' },
    { x: 90, y: 95, dx: -6, dy: -10, dur: '9s', d: '0.5s' },
    { x: 260, y: 80, dx: -14, dy: -6, dur: '7.5s', d: '1.8s' },
  ]
  return (
    <g className="pg-fadein">
      {flies.map((f, i) => (
        <circle key={i} cx={f.x} cy={f.y} r={1.2} fill="#F7DCA0" opacity="0">
          <animate attributeName="cx" values={`${f.x};${f.x + f.dx};${f.x}`}
            dur={f.dur} begin={f.d} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${f.y};${f.y + f.dy};${f.y}`}
            dur={f.dur} begin={f.d} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.7;0.3;0.8;0"
            dur={f.dur} begin={f.d} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

// --- Phase 2 : Sol enrichi ---

function EnrichedGround({ days, timeOfDay = 'day' }) {
  const gc = GROUND_COLORS[timeOfDay] || GROUND_COLORS.day
  return (
    <g>
      {/* Terrain principal — forme organique bord a bord */}
      <path d="M0 158C20 152 50 148 80 150C110 152 130 146 150 148C170 150 200 144 230 148C260 152 285 150 300 154L300 190L0 190Z"
        fill="url(#ground-gradient)" />
      {/* Couche intermediaire terre — irreguliere, bord a bord */}
      <path d="M0 164C12 160 28 157 45 157C70 157 85 154 100 156C130 158 155 152 180 154C210 156 240 152 265 155C280 157 292 160 300 162L300 190L0 190Z"
        fill={gc.layer} opacity="0.35" />
      {/* Couche interieure mousse — organique, bord a bord */}
      <path d="M0 170C18 166 40 161 60 160C90 158 105 161 120 161C150 164 175 158 210 160C240 162 262 161 280 165C290 167 296 169 300 170L300 190L0 190Z"
        fill={gc.moss} opacity="0.25" />

      {/* Mousse dispersee — taches organiques */}
      <ellipse cx="18" cy="166" rx="14" ry="4" fill={gc.moss} opacity="0.15" />
      <ellipse cx="280" cy="164" rx="12" ry="3.5" fill={gc.layer} opacity="0.13" />
      <ellipse cx="95" cy="168" rx="10" ry="3" fill={gc.moss} opacity="0.12" />
      <ellipse cx="200" cy="167" rx="8" ry="2.5" fill={gc.layer} opacity="0.1" />

      {/* Petits cailloux — toujours visibles */}
      <ellipse cx="60" cy="162" rx="2.2" ry="1.2" fill="#A8A294" opacity="0.35" />
      <ellipse cx="200" cy="164" rx="1.8" ry="1" fill="#8A8576" opacity="0.3" />
      <ellipse cx="245" cy="161" rx="2.5" ry="1.1" fill="#A8A294" opacity="0.3" />
      <ellipse cx="120" cy="166" rx="1.5" ry="0.9" fill="#8A8576" opacity="0.25" />

      {/* Feuilles tombees — jour 2+ */}
      {days >= 2 && <>
        <path d="M42 163Q45 159 48 162Q45 164 42 163Z" fill="#E9B85E" opacity="0.25" />
        <path d="M228 165Q231 161 234 164Q231 166 228 165Z" fill="#9A6F2E" opacity="0.2" />
        <path d="M168 167Q171 163 174 166Q171 168 168 167Z" fill="#E9B85E" opacity="0.18" />
      </>}

      {/* Champignons — jour 4+ */}
      {days >= 4 && <>
        <g opacity="0.4">
          <rect x="23" y="157" width="1.2" height="4" rx="0.5" fill="#A8A294" />
          <ellipse cx="23.6" cy="157" rx="3" ry="2" fill="#F3F0E9" />
          <ellipse cx="23.6" cy="157.2" rx="2.5" ry="1.2" fill="#FBFBF6" opacity="0.5" />
        </g>
        <g opacity="0.35">
          <rect x="273" y="159" width="1" height="3.5" rx="0.4" fill="#A8A294" />
          <ellipse cx="273.5" cy="159" rx="2.5" ry="1.8" fill="#F3F0E9" />
          <ellipse cx="273.5" cy="159.2" rx="2" ry="1" fill="#FBFBF6" opacity="0.5" />
        </g>
      </>}

      {/* Trefles — jour 1+ */}
      {days >= 1 && <>
        <g opacity="0.35">
          {[0, 120, 240].map((a, i) => {
            const rad = (a * Math.PI) / 180
            return <ellipse key={i} cx={75 + 2.5 * Math.cos(rad)} cy={164 + 2.5 * Math.sin(rad)}
              rx="1.8" ry="1.8" fill="#7FB089" />
          })}
        </g>
        <g opacity="0.3">
          {[0, 120, 240].map((a, i) => {
            const rad = (a * Math.PI) / 180
            return <ellipse key={i} cx={215 + 2.2 * Math.cos(rad)} cy={166 + 2.2 * Math.sin(rad)}
              rx="1.5" ry="1.5" fill="#5A8262" />
          })}
        </g>
        <g opacity="0.25">
          {[0, 120, 240].map((a, i) => {
            const rad = (a * Math.PI) / 180
            return <ellipse key={i} cx={145 + 2 * Math.cos(rad)} cy={168 + 2 * Math.sin(rad)}
              rx="1.4" ry="1.4" fill="#7FB089" />
          })}
        </g>
      </>}
    </g>
  )
}

// --- Phase 3 : Ombres des plantes ---

function PlantShadow({ x, maturity }) {
  const rx = maturity === 0 ? 4 : maturity === 1 ? 7 : 10
  return (
    <ellipse cx={x} cy="162" rx={rx} ry={1.8} fill="#3A4A3E"
      opacity={maturity === 0 ? 0.06 : maturity === 1 ? 0.08 : 0.1} />
  )
}

// --- Phase 3 : Faune progressive : voir garden/fauna.js et garden/GardenFauna.jsx ---

// --- Phase 3 : Petales ---

function DriftingPetals() {
  const petals = [
    { x: 40, color: '#F3C8D2', dur: '12s', d: '0s', dx: 20, rot: 360 },
    { x: 120, color: '#F7DCA0', dur: '14s', d: '2s', dx: -15, rot: -270 },
    { x: 200, color: '#B8A8C8', dur: '11s', d: '4s', dx: 18, rot: 300 },
    { x: 260, color: '#D98A5A', dur: '13s', d: '1s', dx: -12, rot: -330 },
    { x: 80, color: '#FBFBF6', dur: '15s', d: '3s', dx: 14, rot: 280 },
  ]
  return (
    <g className="pg-fadein" style={{ animationDelay: '1s' }}>
      {petals.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={-5} rx={1.8} ry={1} fill={p.color} opacity="0">
          <animate attributeName="cy" values="-5;170" dur={p.dur} begin={p.d} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${p.x};${p.x + p.dx}`} dur={p.dur} begin={p.d} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.5;0.4;0" dur={p.dur} begin={p.d} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate"
            values={`0 ${p.x} -5;${p.rot} ${p.x + p.dx} 170`} dur={p.dur} begin={p.d} repeatCount="indefinite" />
        </ellipse>
      ))}
    </g>
  )
}

// --- Phase 4 : Rosee ---

function DewDrops() {
  const drops = [
    { x: 65, y: 125 }, { x: 140, y: 118 }, { x: 210, y: 122 },
    { x: 100, y: 130 }, { x: 180, y: 115 },
  ]
  return (
    <g className="pg-fadein">
      {drops.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={1} fill="#EEF4EF" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3"
              dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={d.x - 0.3} cy={d.y - 0.4} r={0.3} fill="#FFFFFF" opacity="0.6" />
        </g>
      ))}
    </g>
  )
}

// --- Phase 5 : Recompenses jour 7 ---

function HarvestGlow() {
  return (
    <rect x="0" y="0" width="300" height="190" fill="url(#harvest-glow)" opacity="0.8">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />
    </rect>
  )
}

function HarvestSparkles() {
  const sparkles = [
    { x: 30, y: 45, d: '0s' }, { x: 70, y: 25, d: '0.8s' },
    { x: 120, y: 50, d: '1.6s' }, { x: 180, y: 30, d: '0.4s' },
    { x: 230, y: 55, d: '1.2s' }, { x: 270, y: 40, d: '2s' },
    { x: 50, y: 70, d: '2.4s' }, { x: 150, y: 20, d: '1.8s' },
  ]
  return (
    <g>
      {sparkles.map((s, i) => (
        <g key={i} opacity="0">
          <animate attributeName="opacity" values="0;0.8;0" dur="3s" begin={s.d} repeatCount="indefinite" />
          <line x1={s.x - 2} y1={s.y} x2={s.x + 2} y2={s.y} stroke="#F7DCA0" strokeWidth="0.5" />
          <line x1={s.x} y1={s.y - 2} x2={s.x} y2={s.y + 2} stroke="#F7DCA0" strokeWidth="0.5" />
        </g>
      ))}
    </g>
  )
}

// --- Helpers ---

function CurvedStem({ h, color = C.stem, w = 2.2 }) {
  return (
    <path
      d={`M0 0C${0.03 * h} ${-h / 3} ${-0.025 * h} ${(-h * 2) / 3} 0 ${-h}`}
      stroke={color} strokeWidth={w} fill="none" strokeLinecap="round"
    />
  )
}

function Leaf({ y, size = 1, side = 'left', color = C.leafDark, wDur = '4.2s', wDelay = '0.5s' }) {
  const d = side === 'left' ? -1 : 1
  const s = size
  const tip = d * 10 * s
  return (
    <g>
      <animateTransform attributeName="transform" type="rotate"
        values={`0 0 ${y};${d * 3} 0 ${y};0 0 ${y}`}
        dur={wDur} begin={wDelay} repeatCount="indefinite" />
      <path
        d={`M0 ${y}C${d * 3 * s} ${y - 4 * s} ${d * 9 * s} ${y - 3 * s} ${tip} ${y - s}C${d * 9 * s} ${y + s} ${d * 3 * s} ${y + 2 * s} 0 ${y}Z`}
        fill={color}
      />
      <path
        d={`M0 ${y}Q${d * 5 * s} ${y - 1.5 * s} ${tip * 0.8} ${y - 0.8 * s}`}
        stroke={color === C.leafDark ? '#3F6B49' : '#5A8262'} strokeWidth="0.4" fill="none" opacity="0.5"
      />
    </g>
  )
}

function Petals({ cy, r, pr, fill, inner, count = 5, breathe = false }) {
  const out = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    const px = r * Math.cos(a), py = cy + r * Math.sin(a)
    out.push(
      <ellipse key={`o${i}`} cx={px} cy={py} rx={pr} ry={pr * 1.4}
        fill={fill} transform={`rotate(${(i / count) * 360} ${px} ${py})`}>
        {breathe && (
          <animate attributeName="rx" values={`${pr};${pr * 1.08};${pr}`}
            dur={`${3 + (i % 3) * 0.5}s`} begin={`${i * 0.2}s`} repeatCount="indefinite" />
        )}
      </ellipse>
    )
  }
  if (inner) {
    const ic = Math.max(count - 1, 3)
    for (let i = 0; i < ic; i++) {
      const a = ((i + 0.5) / ic) * Math.PI * 2 - Math.PI / 2
      const px = r * 0.55 * Math.cos(a), py = cy + r * 0.55 * Math.sin(a)
      out.push(<ellipse key={`i${i}`} cx={px} cy={py} rx={pr * 0.6} ry={pr * 0.9}
        fill={inner} opacity="0.7" transform={`rotate(${((i + 0.5) / ic) * 360} ${px} ${py})`} />)
    }
  }
  return <>{out}</>
}

function Glow({ cy, r, color, dur = '3.5s' }) {
  return (
    <circle cx={0} cy={cy} r={r} fill={color} opacity="0.18">
      <animate attributeName="opacity" values="0.12;0.28;0.12" dur={dur} repeatCount="indefinite" />
      <animate attributeName="r" values={`${r - 1};${r + 1.5};${r - 1}`} dur={dur} repeatCount="indefinite" />
    </circle>
  )
}

function Sprout({ h }) {
  return (
    <g>
      <ellipse cx={0} cy={-h + 0.5} rx={1.8} ry={2.5} fill={C.leafDark} opacity="0.8">
        <animate attributeName="ry" values="2.5;3;2.5" dur="2.5s" repeatCount="indefinite" />
      </ellipse>
    </g>
  )
}

function Bud({ h, color }) {
  return (
    <g>
      <ellipse cx={0} cy={-h - 2} rx={2.2} ry={3.2} fill={color}>
        <animate attributeName="ry" values="3.2;3.6;3.2" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <path d={`M-1.5 ${-h - 0.5}Q0 ${-h - 4} 1.5 ${-h - 0.5}`} fill={C.leafDark} opacity="0.6" />
    </g>
  )
}

function FlowerSparkle({ cx, cy, delay = '0s' }) {
  return (
    <circle cx={cx} cy={cy} r={0.8} fill={C.sparkle} opacity="0">
      <animate attributeName="opacity" values="0;0.9;0" dur="2.5s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="r" values="0.4;1.2;0.4" dur="2.5s" begin={delay} repeatCount="indefinite" />
    </circle>
  )
}

// --- 6 variantes ---

function Rose({ m, h }) {
  const t = -h - 1
  return (
    <>
      <CurvedStem h={h} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <>
        <Leaf y={-h + 8} size={0.9} side="left" wDur="4.2s" wDelay="0.3s" />
        <Leaf y={-h + 14} size={0.7} side="right" color={C.leafLight} wDur="4.8s" wDelay="0.8s" />
      </>}
      {m === 1 && <Bud h={h} color={C.pinkBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t} r={7} color={C.pink} />
        <Petals cy={t} r={3.5} pr={2.8} fill={C.pink} inner={C.pinkDeep} count={5} breathe />
        <circle cx={0} cy={t} r={2} fill={C.pinkCore}>
          <animate attributeName="r" values="2;2.3;2" dur="3s" repeatCount="indefinite" />
        </circle>
        <FlowerSparkle cx={-3} cy={t - 3} delay="0.5s" />
        <FlowerSparkle cx={3} cy={t - 2} delay="1.8s" />
      </g>}
    </>
  )
}

function Lavender({ m, h }) {
  const t = -h
  return (
    <>
      <CurvedStem h={h} color={C.stemDark} w={2} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <>
        <Leaf y={t + 10} size={0.8} side="right" wDur="4.5s" wDelay="0.4s" />
        <Leaf y={t + 16} size={0.65} side="left" color={C.leafLight} wDur="5s" wDelay="0.9s" />
      </>}
      {m === 1 && <Bud h={h} color={C.lavenderBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t - 5} r={6} color={C.lavender} dur="4s" />
        {[0, -3, -6, -8.5, -10.5].map((dy, i) => (
          <ellipse key={i} cx={i % 2 === 0 ? 0 : 0.3} cy={t + dy} rx={2.8 - i * 0.35} ry={2.2 - i * 0.25}
            fill={i % 2 === 0 ? C.lavender : C.lavenderDeep}>
            <animate attributeName="rx" values={`${2.8 - i * 0.35};${3 - i * 0.35};${2.8 - i * 0.35}`}
              dur={`${3 + i * 0.3}s`} begin={`${i * 0.15}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
      </g>}
    </>
  )
}

function Sunflower({ m, h }) {
  const t = -h - 1
  return (
    <>
      <CurvedStem h={h} w={2.6} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <Leaf y={-h + 10} size={1.1} side="right" color={C.leafLight} wDur="4s" wDelay="0.6s" />}
      {m === 1 && <Bud h={h} color={C.yellowBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t} r={9} color={C.yellow} dur="3s" />
        <Petals cy={t} r={4.2} pr={2.6} fill={C.yellow} inner={C.yellowDeep} count={8} breathe />
        <circle cx={0} cy={t} r={3.2} fill={C.yellowCore}>
          <animate attributeName="r" values="3.2;3.5;3.2" dur="4s" repeatCount="indefinite" />
        </circle>
        <FlowerSparkle cx={-4} cy={t - 4} delay="0.3s" />
        <FlowerSparkle cx={4} cy={t + 1} delay="2s" />
        <FlowerSparkle cx={0} cy={t - 5} delay="1.2s" />
      </g>}
    </>
  )
}

function Tulip({ m, h }) {
  const t = -h
  return (
    <>
      <CurvedStem h={h} w={2.3} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <Leaf y={t + 12} size={0.9} side="left" wDur="3.8s" wDelay="0.2s" />}
      {m === 1 && <Bud h={h} color={C.tulipBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t - 3} r={8} color={C.tulipRed} dur="3.8s" />
        <ellipse cx={-3.5} cy={t - 3} rx={3.8} ry={5.8} fill={C.tulipRed}
          transform={`rotate(12 -3.5 ${t - 3})`}>
          <animate attributeName="ry" values="5.8;6.2;5.8" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={3.5} cy={t - 3} rx={3.8} ry={5.8} fill={C.tulipRedDeep}
          transform={`rotate(-12 3.5 ${t - 3})`}>
          <animate attributeName="ry" values="5.8;6.2;5.8" dur="3.5s" begin="0.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx={0} cy={t - 4} rx={3} ry={5.2} fill={C.tulipRed} />
        <ellipse cx={-1.5} cy={t - 5} rx={1} ry={2} fill="#fff" opacity="0.12" />
      </g>}
    </>
  )
}

function Daisy({ m, h }) {
  const t = -h - 1
  return (
    <>
      <CurvedStem h={h} w={2} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <>
        <Leaf y={-h + 9} size={0.85} side="right" wDur="4.3s" wDelay="0.5s" />
        <Leaf y={-h + 15} size={0.6} side="left" color={C.leafLight} wDur="4.7s" wDelay="1s" />
      </>}
      {m === 1 && <Bud h={h} color={C.daisyBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t} r={7.5} color={C.daisy} dur="4.2s" />
        <Petals cy={t} r={4} pr={2.6} fill={C.daisy} count={7} breathe />
        <circle cx={0} cy={t} r={2.5} fill={C.daisyCore}>
          <animate attributeName="r" values="2.5;2.8;2.5" dur="3.5s" repeatCount="indefinite" />
        </circle>
        <FlowerSparkle cx={-3.5} cy={t - 3} delay="1s" />
        <FlowerSparkle cx={2.5} cy={t + 2} delay="2.3s" />
      </g>}
    </>
  )
}

function CoralF({ m, h }) {
  const t = -h - 1
  return (
    <>
      <CurvedStem h={h} color={C.stemDark} />
      {m === 0 && <Sprout h={h} />}
      {m >= 1 && <Leaf y={-h + 8} size={0.9} side="left" color={C.leafLight} wDur="4.4s" wDelay="0.7s" />}
      {m === 1 && <Bud h={h} color={C.coralBud} />}
      {m >= 2 && <g className="pg-bloom">
        <Glow cy={t} r={7} color={C.coral} dur="3.2s" />
        <Petals cy={t} r={3.4} pr={2.7} fill={C.coral} inner={C.coralDeep} count={6} breathe />
        <circle cx={0} cy={t} r={2} fill={C.coralCore}>
          <animate attributeName="r" values="2;2.3;2" dur="3s" repeatCount="indefinite" />
        </circle>
        <FlowerSparkle cx={3} cy={t - 2.5} delay="0.8s" />
      </g>}
    </>
  )
}

const VARIANTS = [Rose, Lavender, Sunflower, Tulip, Daisy, CoralF]

// --- Plante (wind + grow-in) ---
// Maturity per plant: progressive blooming from day 3
// plant index 0 (oldest) matures fastest, newest stays sprout/bud

function Plant({ x, index, maturity, reduce = false }) {
  const V = VARIANTS[index % VARIANTS.length]
  const h = maturity === 0 ? 22 : maturity === 1 ? 40 : 58
  const wind = WIND[index % WIND.length]
  const [pops, setPops] = useState(0)
  // Vent en rafale : rythme commun à tout le jardin, délai proportionnel
  // à x — la rafale traverse la scène de gauche à droite.
  const gustDelay = `${(x * 0.004).toFixed(2)}s`
  // Toucher une plante : les fleurs se balancent et libèrent du pollen,
  // les pousses et boutons font un petit rebond. Avec « réduire les
  // animations », un halo fixe s'affiche brièvement (aucune animation).
  const isFlower = maturity === 2
  const tapClass = reduce ? undefined : isFlower ? 'pg-wiggle' : 'pg-boing'
  const [lit, setLit] = useState(false)
  useEffect(() => {
    if (!lit) return undefined
    const t = setTimeout(() => setLit(false), 700)
    return () => clearTimeout(t)
  }, [lit])
  function handleTap() {
    setPops((n) => n + 1)
    if (reduce) setLit(true)
    try { if (!reduce && navigator.vibrate) navigator.vibrate(8) } catch { /* vibration indisponible */ }
  }
  return (
    <g transform={`translate(${x},160)`}>
      <g className="pg-plant" style={{
        animationDelay: `${index * 0.15}s`,
        '--bloom-delay': pops > 0 ? '0s' : `${index * 0.15 + 0.45}s`,
      }}>
        <g className="pg-gust" style={{ animationDelay: `${(x * 0.005 - 6).toFixed(2)}s` }}>
        <g onClick={handleTap} style={{ cursor: 'pointer' }}>
          {/* Zone de toucher invisible, bien plus large que la tige */}
          <rect x={-15} y={-h - 18} width={30} height={h + 24} fill="transparent" />
          {lit && <circle cx={0} cy={-h} r={11} fill={C.pollen} opacity="0.3" />}
          <animateTransform attributeName="transform" type="rotate"
            values={`0 0 0;${wind.angle} 0 0;0 0 0;${-wind.angle * 0.6} 0 0;0 0 0`}
            dur="3.6s" begin={gustDelay} repeatCount="indefinite" />
          <g key={pops} className={pops > 0 ? tapClass : undefined}>
            <V m={maturity} h={h} />
          </g>
          {pops > 0 && isFlower && !reduce && [-5, -2, 0, 2, 5].map((dx, i) => (
            <circle key={`${pops}-${i}`} className="pg-puff"
              cx={dx} cy={-h - 8} r="1.3" fill={C.pollen}
              style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </g>
        </g>
      </g>
    </g>
  )
}

// Halo doux sur la plante du jour (la dernière plantée)
function TodayHalo({ x, maturity }) {
  const h = maturity === 0 ? 22 : maturity === 1 ? 40 : 58
  return (
    <circle cx={x} cy={160 - h - 4} r="14" fill={C.pollen} opacity="0.2">
      <animate attributeName="opacity" values="0.08;0.28;0.08" dur="3s" repeatCount="indefinite" />
    </circle>
  )
}

// --- Environnement ---

function GrassTufts() {
  return (
    <g>
      {GRASS_POS.map((g, i) => (
        <g key={i} className="pg-gust" style={{ animationDelay: `${(g.x * 0.005 - 6).toFixed(2)}s` }}>
        <g>
          <animateTransform attributeName="transform" type="rotate"
            values={`0 ${g.x} 160;${g.l * 2} ${g.x} 160;0 ${g.x} 160`}
            dur="3.6s" begin={`${(g.x * 0.004).toFixed(2)}s`} repeatCount="indefinite" />
          <path
            d={`M${g.x} 160Q${g.x + g.l} ${160 - g.h / 2} ${g.x + g.l * 0.6} ${160 - g.h}`}
            stroke={i % 2 === 0 ? C.grass : C.grassLight}
            strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </g>
        </g>
      ))}
    </g>
  )
}

function PollenParticles({ extra = false }) {
  const cfg = extra ? [...POLLEN_CFG, ...EXTRA_POLLEN_CFG] : POLLEN_CFG
  return (
    <g>
      {cfg.map((p, i) => (
        <circle key={i} cx={p.x} cy={155} r={0.8} fill={C.pollen} opacity="0">
          <animate attributeName="cy" values="155;15" dur={p.dur} begin={p.delay} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${p.x};${p.x + p.drift}`} dur={p.dur} begin={p.delay} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.65;0.5;0" dur={p.dur} begin={p.delay} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

// Traînées d'air qui traversent le ciel juste avant que les plantes s'inclinent
function GustStreaks({ night }) {
  const lines = [{ y: 58, w: 26, d: 0 }, { y: 92, w: 34, d: 0.25 }, { y: 124, w: 22, d: 0.45 }]
  return (
    <g aria-hidden="true" pointerEvents="none">
      {lines.map((l, i) => (
        <path key={i} className="pg-streak" style={{ animationDelay: `${(l.d - 6).toFixed(2)}s` }}
          d={`M0 ${l.y} q${l.w / 2} -3 ${l.w} 0 t${l.w} 0`}
          stroke={night ? '#C9D6E0' : '#FFFFFF'} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      ))}
    </g>
  )
}

// --- Météo : décor dynamique ---

function WeatherClouds({ variant = 'light' }) {
  const opacity = variant === 'heavy' ? 0.55 : 0.3
  return (
    <g className="pg-fadein">
      {/* Nuage gauche */}
      <g opacity={opacity}>
        <ellipse cx="55" cy="22" rx="22" ry="9" fill="#E7EFE8" />
        <ellipse cx="42" cy="24" rx="14" ry="7" fill="#DCEADF" />
        <ellipse cx="68" cy="24" rx="16" ry="7.5" fill="#DCEADF" />
        <animateTransform attributeName="transform" type="translate"
          values="0,0;6,0;0,0" dur="12s" repeatCount="indefinite" />
      </g>
      {/* Nuage droit */}
      <g opacity={opacity * 0.85}>
        <ellipse cx="220" cy="16" rx="25" ry="10" fill="#E7EFE8" />
        <ellipse cx="205" cy="18" rx="15" ry="8" fill="#DCEADF" />
        <ellipse cx="238" cy="19" rx="18" ry="8" fill="#DCEADF" />
        <animateTransform attributeName="transform" type="translate"
          values="0,0;-5,0;0,0" dur="14s" repeatCount="indefinite" />
      </g>
      {variant === 'heavy' && (
        <g opacity={opacity * 0.7}>
          <ellipse cx="140" cy="12" rx="20" ry="8" fill="#D0DCD2" />
          <ellipse cx="128" cy="14" rx="12" ry="6" fill="#B8D6BD" />
          <ellipse cx="155" cy="14" rx="14" ry="7" fill="#B8D6BD" />
          <animateTransform attributeName="transform" type="translate"
            values="0,0;4,0;0,0" dur="10s" repeatCount="indefinite" />
        </g>
      )}
    </g>
  )
}

function WeatherRain() {
  const drops = [
    { x: 40, d: '0s' }, { x: 75, d: '0.3s' }, { x: 110, d: '0.7s' },
    { x: 145, d: '0.15s' }, { x: 180, d: '0.5s' }, { x: 215, d: '0.85s' },
    { x: 250, d: '0.4s' }, { x: 60, d: '0.6s' }, { x: 130, d: '0.2s' },
    { x: 195, d: '0.9s' }, { x: 265, d: '0.1s' }, { x: 90, d: '0.75s' },
  ]
  return (
    <g>
      <WeatherClouds variant="heavy" />
      {drops.map((r, i) => (
        <line key={i} x1={r.x} y1={30} x2={r.x - 3} y2={38}
          stroke="#9AA8A0" strokeWidth="0.8" strokeLinecap="round" opacity="0">
          <animate attributeName="y1" values="30;152" dur="1.4s" begin={r.d} repeatCount="indefinite" />
          <animate attributeName="y2" values="38;160" dur="1.4s" begin={r.d} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.5;0.4;0" dur="1.2s" begin={r.d} repeatCount="indefinite" />
        </line>
      ))}
    </g>
  )
}

function WeatherDrizzle() {
  const drops = [
    { x: 55, d: '0s' }, { x: 120, d: '0.4s' }, { x: 185, d: '0.8s' },
    { x: 250, d: '0.2s' }, { x: 90, d: '0.6s' }, { x: 155, d: '1s' },
  ]
  return (
    <g>
      <WeatherClouds variant="light" />
      {drops.map((r, i) => (
        <circle key={i} cx={r.x} cy={32} r={0.6} fill="#9AA8A0" opacity="0">
          <animate attributeName="cy" values="32;155" dur="2.2s" begin={r.d} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.4;0.3;0" dur="2s" begin={r.d} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function WeatherSnow() {
  const flakes = [
    { x: 45, d: '0s', dx: 5 }, { x: 90, d: '0.5s', dx: -3 },
    { x: 135, d: '1s', dx: 6 }, { x: 180, d: '0.3s', dx: -4 },
    { x: 225, d: '0.8s', dx: 5 }, { x: 270, d: '1.2s', dx: -6 },
    { x: 60, d: '0.6s', dx: 4 }, { x: 155, d: '0.2s', dx: -5 },
    { x: 205, d: '0.9s', dx: 3 }, { x: 115, d: '1.4s', dx: -4 },
  ]
  return (
    <g>
      <WeatherClouds variant="heavy" />
      {flakes.map((s, i) => (
        <circle key={i} cx={s.x} cy={20} r={1.2} fill="#fff" opacity="0">
          <animate attributeName="cy" values="20;158" dur="4.5s" begin={s.d} repeatCount="indefinite" />
          <animate attributeName="cx" values={`${s.x};${s.x + s.dx};${s.x + s.dx * 2}`}
            dur="4s" begin={s.d} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.7;0.6;0" dur="4s" begin={s.d} repeatCount="indefinite" />
        </circle>
      ))}
    </g>
  )
}

function WeatherFog() {
  return (
    <g className="pg-fadein">
      <rect x="0" y="80" width="300" height="100" fill="#E7EFE8" opacity="0.15">
        <animate attributeName="opacity" values="0.1;0.22;0.1" dur="6s" repeatCount="indefinite" />
      </rect>
      <line x1="20" y1="100" x2="280" y2="100" stroke="#DCEADF" strokeWidth="1.5" strokeLinecap="round" opacity="0.2">
        <animate attributeName="opacity" values="0.15;0.3;0.15" dur="5s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate"
          values="0,0;4,0;0,0" dur="8s" repeatCount="indefinite" />
      </line>
      <line x1="10" y1="120" x2="290" y2="120" stroke="#DCEADF" strokeWidth="1" strokeLinecap="round" opacity="0.15">
        <animate attributeName="opacity" values="0.1;0.25;0.1" dur="7s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate"
          values="0,0;-3,0;0,0" dur="10s" repeatCount="indefinite" />
      </line>
    </g>
  )
}

function WeatherStorm() {
  return (
    <g>
      <WeatherRain />
      {/* Éclair */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;0.8;0;0;0;0.6;0;0;0;0;0;0;0;0;0;0;0;0;0"
          dur="6s" repeatCount="indefinite" />
        <path d="M148 8L142 24L150 22L144 38" fill="none"
          stroke="#F7DCA0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  )
}

function WeatherDecor({ weather }) {
  if (!weather) return null
  switch (weather.type) {
    case 'clear': return null // soleil gere par CelestialSun
    case 'cloudy': return <WeatherClouds variant="light" />
    case 'fog': return <WeatherFog />
    case 'drizzle': return <WeatherDrizzle />
    case 'rain': return <WeatherRain />
    case 'snow': return <WeatherSnow />
    case 'storm': return <WeatherStorm />
    default: return null
  }
}

// --- Composant principal ---

/**
 * Maturity per plant: croissance naturelle jour par jour.
 * Chaque plante progresse selon son âge (jours depuis sa plantation) :
 * - Age 0 (plantée aujourd'hui) → bourgeon (m=0)
 * - Age 1 (plantée hier) → bouton (m=1)
 * - Age ≥ 2 (plantée avant-hier+) → fleur épanouie (m=2)
 * - Jour 7 spécial : toutes les plantes fleurissent (récompense)
 */
function getPlantMaturity(plantIndex, plantCount, days) {
  if (days >= 7) return 2 // Récompense jour 7 : jardin en pleine floraison
  // L'âge de la plante = nombre de jours écoulés depuis sa plantation
  // Plante index 0 est la plus ancienne (plantée jour 1), index plantCount-1 la plus récente
  const plantAge = days - plantIndex - 1
  if (plantAge >= 2) return 2 // fleur
  if (plantAge >= 1) return 1 // bouton
  return 0 // bourgeon (plantée aujourd'hui)
}

export default function GrowingGarden({ days = 0 }) {
  const [weather, setWeather] = useState(null)
  const [reduce, setReduce] = useState(false)
  const svgRef = useRef(null)
  const faunaRef = useRef(null)

  useEffect(() => {
    fetchWeather().then((w) => { if (w) setWeather(w) })
  }, [])

  // prefers-reduced-motion : les animations CSS sont coupées par global.css,
  // mais pas le SMIL (<animate>). pauseAnimations() gèle tout le SVG d'un coup.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      setReduce(mq.matches)
      const svg = svgRef.current
      if (svg && svg.pauseAnimations) {
        if (mq.matches) svg.pauseAnimations()
        else svg.unpauseAnimations()
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const timeOfDay = getTimeOfDay()
  const plantCount = Math.min(days, 7)
  const hasFlowers = days >= 3
  const positions = Array.from({ length: plantCount }, (_, i) => {
    const spread = 240 / Math.max(plantCount, 1)
    return 35 + i * spread + ((i % 2) * 6 - 3)
  })

  // Fleurs épanouies, avec leur balancement (même WIND que Plant) : les insectes s'y posent
  const flowers = positions
    .map((x, i) => ({ x, angle: WIND[i % WIND.length].angle, mature: getPlantMaturity(i, plantCount, days) === 2 }))
    .filter((f) => f.mature)

  // Faune : apparaît au fil des jours suivis (mêmes seuils qu'avant)
  const fauna = [
    days >= 2 && { id: 'coccinelle', species: 'coccinelle' },
    hasFlowers && { id: 'papillon', species: 'papillon' },
    flowers.length > 0 && { id: 'abeille-butineuse', species: 'butineuse' },
    days >= 4 && { id: 'libellule', species: 'libellule' },
    days >= 5 && { id: 'abeille', species: 'abeille' },
    days >= 6 && { id: 'oiseau', species: 'oiseau' },
    days >= 7 && { id: 'essaim-1', species: 'abeille' },
    days >= 7 && { id: 'essaim-2', species: 'abeille' },
    days >= 7 && { id: 'papillon-dore', species: 'papillon-dore' },
  ].filter(Boolean)

  // Toucher le jardin : les insectes proches du doigt sont envoyés bouler,
  // tournoient, se remettent d'aplomb puis repartent avec une nouvelle idée.
  function knockInsects(e) {
    const hits = faunaRef.current?.knockAt(e.clientX, e.clientY) || 0
    try { if (hits && navigator.vibrate) navigator.vibrate(12) } catch { /* vibration indisponible */ }
  }

  return (
    <svg ref={svgRef} viewBox="0 0 300 190" onPointerDown={knockInsects}
      style={{ width: '100%', display: 'block', touchAction: 'manipulation' }} role="img"
      aria-label={`Jardin de ${days} jour${days > 1 ? 's' : ''} suivi${days > 1 ? 's' : ''}`}>
      <style>{SVG_STYLE}</style>

      {/* Defs : gradients */}
      <defs>
        <SkyGradientDefs timeOfDay={timeOfDay} />
      </defs>

      {/* 1. Ciel */}
      <SkyBackground timeOfDay={timeOfDay} />

      {/* 2. Collines lointaines */}
      <DistantHills timeOfDay={timeOfDay} />

      {/* 3. Astres */}
      {(timeOfDay === 'dawn' || timeOfDay === 'day') && <CelestialSun timeOfDay={timeOfDay} weather={weather} />}
      {(timeOfDay === 'dusk' || timeOfDay === 'night') && <CelestialMoon timeOfDay={timeOfDay} />}

      {/* 4. Etoiles / lucioles */}
      {timeOfDay === 'night' && <Stars />}
      {timeOfDay === 'dusk' && <Fireflies />}

      {/* 5. Météo */}
      <WeatherDecor weather={weather} />

      {/* 5. Sol enrichi + decorations */}
      <EnrichedGround days={days} timeOfDay={timeOfDay} />

      {/* 7. Ombres des plantes */}
      {positions.map((x, i) => (
        <PlantShadow key={`sh${i}`} x={x} maturity={getPlantMaturity(i, plantCount, days)} />
      ))}

      {/* 7bis. Rafales : traînées d'air (animation CSS, coupée si « réduire les animations ») */}
      {plantCount > 0 && <GustStreaks night={timeOfDay === 'night' || timeOfDay === 'dusk'} />}
      {/* 8. Herbe */}
      {plantCount > 0 && <GrassTufts />}

      {/* 9. Halo sur la plante du jour */}
      {plantCount > 0 && (
        <TodayHalo x={positions[plantCount - 1]}
          maturity={getPlantMaturity(plantCount - 1, plantCount, days)} />
      )}

      {/* 10. Plantes */}
      {positions.map((x, i) => (
        <Plant key={i} x={x} index={i} reduce={reduce}
          maturity={getPlantMaturity(i, plantCount, days)} />
      ))}

      {/* 10. Rosee (dawn) */}
      {timeOfDay === 'dawn' && days >= 5 && <DewDrops />}

      {/* 11. Pollen + petales */}
      {hasFlowers && <PollenParticles extra={days >= 7} />}
      {days >= 5 && <DriftingPetals />}

      {/* 12. Faune : comportements libres (garden/fauna.js) */}
      <GardenFauna ref={faunaRef} species={fauna} flowers={flowers} reduce={reduce} svgRef={svgRef} C={C} />

      {/* 13. Halo de récolte (jour 7) */}
      {days >= 7 && <HarvestGlow />}
      {days >= 7 && <HarvestSparkles />}

      {/* Message jour 0 */}
      {days === 0 && (
        <>
          <circle cx="150" cy="158" r="3" fill={C.stemDark} opacity="0.4" />
          <text x="150" y="85" textAnchor="middle" fontSize="13" fill="#9DAFA1" fontFamily="Nunito Variable, Nunito, sans-serif">
            Ton jardin attend sa première pousse
          </text>
        </>
      )}
    </svg>
  )
}
