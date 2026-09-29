import { colors } from '../theme/tokens'
import { zoneLabels } from '../data/conditions'

// =============================================================
// BodySilhouette — silhouette organique (formes arrondies, DA jardin)
// Props :
//   suggested : string[]  zones suggérées (pointillé ambre)
//   active    : string[]  zones sélectionnées par l'utilisateur (rose)
//   onToggle  : (zoneId) => void
// =============================================================

// Zones interactives — courbes organiques, gaps resserrés
const ZONES = {
  tete: 'M60 5 C71 5 80 14 80 25 C80 36 71 44 60 44 C49 44 40 36 40 25 C40 14 49 5 60 5 Z',
  torse:
    'M47 50 C42 50 39 55 39 62 C39 72 40 82 41 88 C42 94 50 99 60 99 C70 99 78 94 79 88 C80 82 81 72 81 62 C81 55 78 50 73 50 Z',
  abdomen:
    'M45 101 C44 107 43 118 45 130 C47 137 53 142 60 142 C67 142 73 137 75 130 C77 118 76 107 75 101 Z',
  brasG:
    'M38 54 C32 56 28 65 27 80 C26 94 27 106 30 114 C33 119 38 118 39 112 C40 98 40 72 41 58 C41 54 41 53 38 54 Z',
  brasD:
    'M82 54 C88 56 92 65 93 80 C94 94 93 106 90 114 C87 119 82 118 81 112 C80 98 80 72 79 58 C79 54 79 53 82 54 Z',
  jambeG:
    'M47 144 C45 160 44 180 46 196 C47 201 54 201 55 196 C57 180 57 158 56 147 C55 143 48 142 47 144 Z',
  jambeD:
    'M73 144 C75 160 76 180 74 196 C73 201 66 201 65 196 C63 180 63 158 64 147 C65 143 72 142 73 144 Z',
}

export default function BodySilhouette({ suggested = [], active = [], onToggle }) {
  const fillFor = (id) => {
    if (active.includes(id)) return colors.pink.bg
    if (suggested.includes(id)) return colors.amber.bg
    return colors.green.soft
  }
  const strokeFor = (id) => {
    if (active.includes(id)) return colors.pink.border
    if (suggested.includes(id)) return colors.amber.border
    return colors.border.soft
  }

  const deco = { fill: colors.green.softer, stroke: colors.border.soft, strokeWidth: 1 }

  return (
    <svg
      viewBox="0 0 120 214"
      style={{ height: 164, overflow: 'visible' }}
      role="group"
      aria-label="Silhouette du corps, tapez une zone pour la sélectionner"
      className="anim-fadeIn"
    >
      <defs>
        <filter id="bs-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2E4034" floodOpacity="0.08" />
        </filter>
      </defs>

      <g filter="url(#bs-shadow)">
        {/* Éléments décoratifs (non-interactifs) */}
        <g aria-hidden="true" pointerEvents="none">
          {/* Cou */}
          <path d="M55 44 C55 47 56 50 57 50 L63 50 C64 50 65 47 65 44" {...deco} />
          {/* Mains */}
          <path d="M29 114 C27 118 26 122 28 124 C31 126 34 122 33 118 Z" {...deco} />
          <path d="M91 114 C93 118 94 122 92 124 C89 126 86 122 87 118 Z" {...deco} />
          {/* Pieds */}
          <path d="M46 198 C44 202 42 206 45 208 C49 210 54 207 55 201 Z" {...deco} />
          <path d="M74 198 C76 202 78 206 75 208 C71 210 66 207 65 201 Z" {...deco} />
        </g>

        {/* Zones interactives */}
        {Object.entries(ZONES).map(([id, d]) => (
          <path
            key={id}
            d={d}
            role="button"
            tabIndex={0}
            aria-pressed={active.includes(id)}
            aria-label={zoneLabels[id] || id}
            onClick={() => onToggle?.(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle?.(id)
              }
            }}
            className="bs-zone"
            style={{
              fill: fillFor(id),
              stroke: strokeFor(id),
              strokeWidth: 1.5,
              strokeDasharray: suggested.includes(id) && !active.includes(id) ? '3 2' : 'none',
              cursor: 'pointer',
              transition: 'fill .15s, transform .1s',
            }}
          />
        ))}

        {/* Ligne médiane — relief subtil sur le torse */}
        <line style={{ stroke: colors.border.soft }} x1="60" y1="56" x2="60" y2="96"
          strokeWidth={0.5} opacity={0.35}
          strokeDasharray="2 3" pointerEvents="none" />
      </g>
    </svg>
  )
}
