// =============================================================
// Faune du jardin : rendu SVG + boucle d'animation.
// Le comportement est dans fauna.js. Ici : les dessins, et une boucle
// requestAnimationFrame qui écrit directement les attributs SVG (aucun rendu
// React par image). La boucle s'arrête quand le jardin sort de l'écran ou que
// l'onglet est caché ; avec « réduire les animations », les insectes sont
// posés et immobiles.
// =============================================================
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { createFauna, pose, WORLD } from './fauna'

// ---- Dessins (origine = centre du corps) ----
// Vus de dessus (tête vers le haut) : papillons, libellule.
// Vus de profil (tête vers la gauche) : abeilles, coccinelle, oiseau.

function ButterflySprite({ C, golden, setRef }) {
  const body = golden ? '#9A6F2E' : C.butterfly
  const wing = golden ? '#F7DCA0' : C.butterflyWing
  const dot = golden ? '#E9B85E' : C.butterfly
  return (
    <g transform="scale(1.25)">
      <g ref={setRef('wingL')}>
        <path d="M-0.4,-0.6C-3.8,-4.6 -6.2,-2 -3.6,0.6C-5.4,0.4 -5.4,3.2 -1.4,2.1Z" fill={wing} opacity="0.75" />
        <circle cx="-3.3" cy="-1.6" r="0.55" fill={dot} opacity="0.5" />
      </g>
      <g ref={setRef('wingR')}>
        <path d="M0.4,-0.6C3.8,-4.6 6.2,-2 3.6,0.6C5.4,0.4 5.4,3.2 1.4,2.1Z" fill={wing} opacity="0.75" />
        <circle cx="3.3" cy="-1.6" r="0.55" fill={dot} opacity="0.5" />
      </g>
      <ellipse cx="0" cy="0" rx="0.6" ry="2" fill={body} />
      <path d="M-0.3,-1.8Q-1.2,-3 -1.8,-3.6M0.3,-1.8Q1.2,-3 1.8,-3.6" stroke={body} strokeWidth="0.22" fill="none" strokeLinecap="round" />
      <circle cx="-1.8" cy="-3.6" r="0.3" fill={dot} />
      <circle cx="1.8" cy="-3.6" r="0.3" fill={dot} />
    </g>
  )
}

function BeeSprite({ C, big }) {
  return (
    <g transform={`scale(${big ? 1.6 : 1.4})`}>
      <ellipse cx="0.2" cy="0" rx="2" ry="1.35" fill={C.bee} />
      <path d="M-0.5,-1.25V1.25M0.6,-1.2V1.2" stroke="#3A4A3E" strokeWidth="0.45" />
      <circle cx="-2.1" cy="-0.15" r="0.85" fill="#3A4A3E" />
      <path d="M2.1,0.1L2.9,0.3" stroke="#3A4A3E" strokeWidth="0.3" strokeLinecap="round" />
      <path d="M-2.5,-0.7Q-3.1,-1.7 -3.6,-1.9" stroke="#3A4A3E" strokeWidth="0.18" fill="none" strokeLinecap="round" />
      {/* Ailes : bourdonnement continu (SMIL), indépendant du vol */}
      <ellipse cx="-0.2" cy="-1.5" rx="1.5" ry="0.75" fill={C.beeWing} opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" values="-28 0 -1;14 0 -1;-28 0 -1" dur="0.11s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="0.9" cy="-1.4" rx="1.3" ry="0.65" fill={C.beeWing} opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" values="22 0.6 -1;-12 0.6 -1;22 0.6 -1" dur="0.13s" repeatCount="indefinite" />
      </ellipse>
    </g>
  )
}

function LadybugSprite({ setRef }) {
  return (
    <g transform="scale(1.1)">
      {/* Ailes de vol, visibles seulement pendant un petit envol */}
      <g ref={setRef('fly')} style={{ display: 'none' }}>
        <ellipse cx="1.4" cy="-2.2" rx="3.2" ry="1.1" fill="#EDE7DA" opacity="0.55" transform="rotate(-28 1.4 -2.2)" />
        <ellipse cx="0.4" cy="-2.6" rx="3" ry="1" fill="#EDE7DA" opacity="0.45" transform="rotate(-50 0.4 -2.6)" />
      </g>
      <g ref={setRef('shell')}>
        <path d="M-2.5,0A2.5,2.2 0 0 1 2.5,0Z" fill="#C46040" transform="translate(0 0.9)" />
        <circle cx="-0.6" cy="-0.1" r="0.45" fill="#2E2E2E" />
        <circle cx="1" cy="0.2" r="0.4" fill="#2E2E2E" />
      </g>
      <path d="M-2.5,0.9H2.5" stroke="#2E2E2E" strokeWidth="0.35" />
      <ellipse cx="-2.9" cy="0.35" rx="1.05" ry="0.9" fill="#2E2E2E" />
      <path d="M-3.6,-0.2L-4.4,-1.2M-1.6,1.1L-2,1.8M0,1.1L0,1.9M1.6,1.1L2,1.8" stroke="#2E2E2E" strokeWidth="0.22" strokeLinecap="round" />
    </g>
  )
}

function DragonflySprite() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="0.6" ry="3.6" fill="#5A8262" />
      <line x1="0" y1="3.4" x2="0" y2="9" stroke="#5A8262" strokeWidth="0.6" strokeLinecap="round" />
      {[[-4, -1, -10, 5, 1.2], [4, -1, 10, 5, 1.2], [-3.5, 1.5, 5, 4, 1], [3.5, 1.5, -5, 4, 1]].map(([cx, cy, rot, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="#DCEADF" opacity="0.35" transform={`rotate(${rot} ${cx} ${cy})`}>
          <animate attributeName="opacity" values="0.22;0.48;0.22" dur={`${0.5 + i * 0.07}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      <circle cx="-0.9" cy="-3.8" r="0.65" fill="#3F6B49" />
      <circle cx="0.9" cy="-3.8" r="0.65" fill="#3F6B49" />
    </g>
  )
}

function BirdSprite({ setRef }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="3" ry="2" fill="#8A8576" />
      <circle cx="-3.2" cy="-0.8" r="1.5" fill="#A8A294" />
      <path d="M-4.5,-1L-6,-0.8L-4.5,-0.4Z" fill="#E9B85E" />
      <circle cx="-3.6" cy="-1.2" r="0.4" fill="#2E2E2E" />
      <path ref={setRef('wingL')} d="M0,-1.5Q3,-5 5,-2Q3,-0.5 0,-1.5Z" fill="#8A8576" opacity="0.75" />
      <path d="M3,0Q5,2 6,-1Q4,-0.5 3,0Z" fill="#8A8576" opacity="0.6" />
    </g>
  )
}

const SPRITES = {
  papillon: (p) => <ButterflySprite {...p} />,
  'papillon-dore': (p) => <ButterflySprite {...p} golden />,
  abeille: (p) => <BeeSprite {...p} />,
  butineuse: (p) => <BeeSprite {...p} big />,
  libellule: () => <DragonflySprite />,
  coccinelle: (p) => <LadybugSprite {...p} />,
  oiseau: (p) => <BirdSprite {...p} />,
}

// Écrit l'état d'un agent dans ses éléments SVG
function paint(a, els) {
  if (!els?.root) return
  els.root.setAttribute('transform', pose(a))
  els.root.setAttribute('opacity', (a.sp.opacity * a.alpha).toFixed(2))
  if (els.wingL && els.wingR) {                         // papillons (vus de dessus)
    const s = (1 - a.wing * 0.78).toFixed(3)
    els.wingL.setAttribute('transform', `scale(${s} 1)`)
    els.wingR.setAttribute('transform', `scale(${s} 1)`)
  } else if (els.wingL) {                               // oiseau
    const flap = a.mode === 'forage' || a.mode === 'rest' ? 0 : Math.sin(a.wingPhase * 1.6) * 22
    els.wingL.setAttribute('transform', `rotate(${flap.toFixed(1)} 0 -1.5)`)
  }
  if (els.fly) {                                        // coccinelle
    els.fly.style.display = a.wingsOpen ? '' : 'none'
    els.shell.setAttribute('transform', a.wingsOpen ? 'rotate(-24 -1 0.9)' : '')
  }
}

// species : [{ id, species }] ; flowers : [{ x, angle }]
const GardenFauna = forwardRef(function GardenFauna({ species, flowers, reduce, svgRef, C, seed }, ref) {
  const engineRef = useRef(null)
  if (!engineRef.current) engineRef.current = createFauna({ rng: seed })
  const engine = engineRef.current
  const els = useRef({})
  const mounted = useRef(false)

  // Référence de chaque élément à piloter : els.current[id][part]
  const setRef = (id) => (part) => (node) => {
    if (!els.current[id]) els.current[id] = {}
    els.current[id][part] = node
  }

  const paintAll = () => { for (const a of engine.agents.values()) paint(a, els.current[a.id]) }

  // Synchronise les agents avec les espèces présentes (le jardin grandit)
  const key = species.map((s) => s.id).join('|')
  useEffect(() => {
    const wanted = new Set(species.map((s) => s.id))
    for (const id of [...engine.agents.keys()]) if (!wanted.has(id)) engine.remove(id)
    for (const s of species) if (!engine.agents.has(s.id)) engine.spawn(s.id, s.species, { inside: !mounted.current || s.species === 'coccinelle' })
    mounted.current = true
    if (reduce) engine.settle()
    paintAll()
  }, [key, reduce])   // eslint-disable-line react-hooks/exhaustive-deps

  const fkey = flowers.map((f) => f.x.toFixed(1)).join('|')
  useEffect(() => { engine.setFlowers(flowers); if (reduce) { engine.settle(); paintAll() } }, [fkey])   // eslint-disable-line react-hooks/exhaustive-deps

  // Horloge des animations SMIL : pour suivre le balancement des fleurs
  useEffect(() => {
    engine.setClock(() => { const s = svgRef.current; return s?.getCurrentTime ? s.getCurrentTime() : engine.time })
  }, [svgRef, engine])

  // Boucle d'animation
  useEffect(() => {
    if (reduce) return undefined
    let raf = 0, last = 0, visible = true
    const frame = (now) => {
      if (last) engine.step((now - last) / 1000)
      last = now
      paintAll()
      raf = visible ? requestAnimationFrame(frame) : 0
    }
    const io = typeof IntersectionObserver !== 'undefined' && svgRef.current
      ? new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame) }
      })
      : null
    if (io) io.observe(svgRef.current)
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); io?.disconnect() }
  }, [reduce])   // eslint-disable-line react-hooks/exhaustive-deps

  // Toucher : coordonnées écran → coordonnées du jardin, puis bousculade
  useImperativeHandle(ref, () => ({
    knockAt(clientX, clientY) {
      if (reduce) return 0
      const svg = svgRef.current
      const m = svg?.getScreenCTM?.()
      if (!m) return 0
      const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse())
      return engine.knock(p.x, p.y)
    },
    engine,
  }), [reduce, svgRef, engine])

  return (
    <g aria-hidden="true">
      {species.map((s) => (
        <g key={s.id} data-insect={s.id} ref={setRef(s.id)('root')} opacity="0" transform={`translate(${WORLD.w / 2} -40)`}>
          {SPRITES[s.species]({ C, setRef: setRef(s.id) })}
        </g>
      ))}
    </g>
  )
})

export default GardenFauna
