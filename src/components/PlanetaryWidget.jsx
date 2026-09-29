import { useState, useEffect } from 'react'
import { radius, shadow, font, type } from '../theme/tokens'
import { getMoonPhase, getMoonPhaseName } from '../data/astro'

// 8 phases pour le bandeau visuel
const PHASE_ICONS = [
  { phase: 0.0,    label: 'Nouvelle' },
  { phase: 0.125,  label: 'Premier croissant' },
  { phase: 0.25,   label: 'Premier quartier' },
  { phase: 0.375,  label: 'Gibbeuse croissante' },
  { phase: 0.5,    label: 'Pleine' },
  { phase: 0.625,  label: 'Gibbeuse décroissante' },
  { phase: 0.75,   label: 'Dernier quartier' },
  { phase: 0.875,  label: 'Dernier croissant' },
]

// Palette de la lune : la carte représente toujours un ciel de nuit,
// indépendamment du thème de l'application.
const MOON = {
  dark: '#34405A',     // face non éclairée (légèrement plus claire que le ciel)
  light: '#F4EFD8',    // clair de lune
  rim: '#C9C2A0',
  glowColor: '#F4EFD8',
}
const SKY = {
  top: '#18222F',
  bottom: '#24344A',
  text: '#EEF1F5',
  soft: '#B9C3D0',     // 8,4:1 sur le ciel
  tile: 'rgba(255, 255, 255, 0.07)',
  tileBorder: 'rgba(255, 255, 255, 0.12)',
  accent: '#F4DFA0',
}

/**
 * Contour de la partie éclairée de la lune (hémisphère nord).
 * Croissante : lumière à droite ; décroissante : lumière à gauche.
 * Le terminateur est une demi-ellipse de rayon horizontal r·|cos(2πφ)| :
 * il bombe vers le côté éclairé pour un croissant, vers l'ombre pour une gibbeuse.
 */
function litPath(phase, cx, cy, r) {
  const waxing = phase <= 0.5
  const c = Math.cos(2 * Math.PI * phase)
  const rx = Math.abs(c) * r
  const crescent = c > 0 // moins de la moitié éclairée
  const outer = waxing ? 1 : 0
  const term = crescent ? 1 - outer : outer
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${term} ${cx} ${cy - r} Z`
}
const illuminationOf = (phase) => (1 - Math.cos(2 * Math.PI * phase)) / 2

/** Icone SVG de phase lunaire */
function MoonIcon({ phase, cx, cy, r, glow = false }) {
  const illumination = illuminationOf(phase)

  if (illumination < 0.04) {
    return (
      <g>
        {glow && <circle style={{ fill: MOON.glowColor }} cx={cx} cy={cy} r={r + 3} opacity="0.12">
          <animate attributeName="opacity" values="0.12;0.22;0.12" dur="3s" repeatCount="indefinite" />
        </circle>}
        <circle style={{ fill: MOON.dark }} cx={cx} cy={cy} r={r} />
        <circle style={{ stroke: MOON.rim }} cx={cx} cy={cy} r={r} fill="none" strokeWidth="0.6" opacity="0.4" />
      </g>
    )
  }
  if (illumination > 0.96) {
    return (
      <g>
        {glow && <circle style={{ fill: MOON.glowColor }} cx={cx} cy={cy} r={r + 4} opacity="0.15">
          <animate attributeName="opacity" values="0.15;0.28;0.15" dur="3s" repeatCount="indefinite" />
          <animate attributeName="r" values={`${r + 3};${r + 5};${r + 3}`} dur="3s" repeatCount="indefinite" />
        </circle>}
        <circle style={{ fill: MOON.light }} cx={cx} cy={cy} r={r} />
        <circle style={{ stroke: MOON.glowColor }} cx={cx} cy={cy} r={r + 1.5} fill="none" strokeWidth="0.5" opacity="0.25" />
        <circle style={{ stroke: MOON.rim }} cx={cx} cy={cy} r={r} fill="none" strokeWidth="0.4" />
      </g>
    )
  }

  return (
    <g>
      {glow && <circle style={{ fill: MOON.glowColor }} cx={cx} cy={cy} r={r + 3} opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
      </circle>}
      <circle style={{ fill: MOON.dark }} cx={cx} cy={cy} r={r} />
      <path style={{ fill: MOON.light }} d={litPath(phase, cx, cy, r)} />
      <circle style={{ stroke: MOON.rim }} cx={cx} cy={cy} r={r} fill="none" strokeWidth="0.4" opacity="0.5" />
    </g>
  )
}

/** Mini lune pour le bandeau */
function MiniMoon({ phase, cx, cy, r }) {
  const illumination = illuminationOf(phase)
  if (illumination < 0.03) {
    return <circle style={{ fill: MOON.dark, stroke: MOON.rim }} cx={cx} cy={cy} r={r} strokeWidth="0.5" />
  }
  if (illumination > 0.97) {
    return <circle style={{ fill: MOON.light, stroke: MOON.rim }} cx={cx} cy={cy} r={r} strokeWidth="0.4" />
  }
  return (
    <g>
      <circle style={{ fill: MOON.dark }} cx={cx} cy={cy} r={r} />
      <path style={{ fill: MOON.light }} d={litPath(phase, cx, cy, r)} />
      <circle style={{ stroke: MOON.rim }} cx={cx} cy={cy} r={r} fill="none" strokeWidth="0.4" />
    </g>
  )
}

const LUNATION = 29.53

// Index de la phase dans PHASE_ICONS, avec les mêmes bornes que le nom
// affiché (getMoonPhaseName dans astro.js) pour que titre et frise concordent.
const PHASE_BOUNDS = [0.0375, 0.2125, 0.2875, 0.4625, 0.5375, 0.7125, 0.7875, 0.9625]
function phaseIndex(phase) {
  const i = PHASE_BOUNDS.findIndex((max) => phase <= max)
  return i === -1 ? 0 : i
}

// Jours avant une phase cible (0 = nouvelle lune, 0,5 = pleine lune)
function daysUntil(phase, target) {
  return (((target - phase) % 1) + 1) % 1 * LUNATION
}
function dateIn(days) {
  const d = new Date(Date.now() + days * 86400000)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function inDaysLabel(days) {
  const n = Math.round(days)
  if (n <= 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  return `dans ${n} jours`
}

/**
 * Repères lunaires — option personnelle, désactivée par défaut (CLAUDE.md §3).
 * Carte « fenêtre sur le ciel de nuit » : phase du jour, prochaines pleine et
 * nouvelle lunes, frise des 8 phases. La mention « sans valeur médicale »
 * est obligatoire et ne doit pas être retirée.
 */
export default function PlanetaryWidget({ showMoon = true, compact = false }) {
  const [data, setData] = useState(() => compute())
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setData(compute()), 60000)
    return () => clearInterval(id)
  }, [])

  if (!showMoon) return null

  const { moonPhase, moonInfo } = data
  const waxing = moonPhase <= 0.5
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * moonPhase)) / 2) * 100)
  const toFull = daysUntil(moonPhase, 0.5)
  const toNew = daysUntil(moonPhase, 0)
  const moonSize = compact ? 64 : 84
  const currentIdx = phaseIndex(moonPhase)

  const tile = {
    flex: 1, minWidth: 0, background: SKY.tile, border: `1px solid ${SKY.tileBorder}`,
    borderRadius: radius.small, padding: '10px 12px',
  }

  return (
    <section aria-label="Repères lunaires" style={{
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(170deg, ${SKY.top} 0%, ${SKY.bottom} 100%)`,
      borderRadius: radius.lg, padding: compact ? 16 : 18, color: SKY.text,
      boxShadow: shadow.card,
    }}>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={moonSize} height={moonSize} viewBox="0 0 84 84" role="img" aria-label={`${moonInfo.label}, éclairée à ${illumination} %`} style={{ flexShrink: 0, overflow: 'visible' }}>
          <MoonIcon phase={moonPhase} cx={42} cy={42} r={32} glow />
        </svg>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: font.display, fontSize: compact ? type.lg : 24, fontWeight: 600, lineHeight: 1.1, color: SKY.text }}>
            {moonInfo.label}
          </div>
          <div style={{ fontSize: type.sm, color: SKY.soft, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={`ti ${waxing ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ fontSize: 15 }} aria-hidden="true" />
            {waxing ? 'Croissante' : 'Décroissante'}, éclairée à {illumination} %
          </div>
          {moonInfo.description && !compact && (
            <div style={{ fontSize: type.sm, color: SKY.soft, fontStyle: 'italic', marginTop: 6, lineHeight: 1.45 }}>
              {moonInfo.description}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 8, marginTop: 16 }}>
        <div style={tile}>
          <div style={{ fontSize: type.xs, color: SKY.soft, fontWeight: 700 }}>Pleine lune</div>
          <div style={{ fontSize: type.base, fontWeight: 700, color: SKY.accent, marginTop: 2 }}>{inDaysLabel(toFull)}</div>
          <div style={{ fontSize: type.xs, color: SKY.soft }}>{dateIn(toFull)}</div>
        </div>
        <div style={tile}>
          <div style={{ fontSize: type.xs, color: SKY.soft, fontWeight: 700 }}>Nouvelle lune</div>
          <div style={{ fontSize: type.base, fontWeight: 700, color: SKY.text, marginTop: 2 }}>{inDaysLabel(toNew)}</div>
          <div style={{ fontSize: type.xs, color: SKY.soft }}>{dateIn(toNew)}</div>
        </div>
      </div>

      {/* Frise des 8 phases : la phase du jour est entourée */}
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        style={{
          position: 'relative', width: '100%', marginTop: 14, padding: '10px 4px 6px',
          border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: SKY.soft,
        }}>
        <ol aria-label="Les 8 phases de la lune" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 2 }}>
          {PHASE_ICONS.map((p, i) => {
            const isCurrent = i === currentIdx
            return (
              <li key={i} aria-label={p.label} aria-current={isCurrent ? 'true' : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ overflow: 'visible' }}>
                  {isCurrent && <circle cx="13" cy="13" r="12.5" fill="none" stroke={SKY.accent} strokeWidth="1.2" />}
                  <MiniMoon phase={p.phase} cx={13} cy={13} r={isCurrent ? 9 : 7} />
                </svg>
              </li>
            )
          })}
        </ol>
        {expanded && (
          <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px', textAlign: 'left' }}>
            {PHASE_ICONS.map((p, i) => {
              const isCurrent = i === currentIdx
              return (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: type.sm, color: isCurrent ? SKY.accent : SKY.text, fontWeight: isCurrent ? 700 : 500 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><MiniMoon phase={p.phase} cx={9} cy={9} r={7} /></svg>
                  {p.label}{isCurrent ? ' (aujourd\u2019hui)' : ''}
                </li>
              )
            })}
          </ul>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: type.xs, fontWeight: 700, marginTop: 8 }}>
          {expanded ? 'Masquer les noms' : 'Voir le nom des phases'}
          <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} aria-hidden="true" />
        </span>
      </button>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: type.xs, color: SKY.soft }}>
        <i className="ti ti-info-circle" style={{ fontSize: 14 }} aria-hidden="true" />
        Repère personnel, sans valeur médicale.
      </div>
    </section>
  )
}

function compute() {
  const now = new Date()
  return {
    moonPhase: getMoonPhase(now),
    moonInfo: getMoonPhaseName(now),
  }
}
