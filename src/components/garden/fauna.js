// =============================================================
// Faune du jardin : moteur de comportement (logique pure, sans DOM).
//
// Chaque insecte est un agent autonome : position, vitesse, « humeur » et un
// petit automate d'états propre à son espèce. Pas de trajet fixe : du bruit
// lissé (sommes de sinus à fréquences aléatoires incommensurables), des durées
// et des décisions tirées au hasard, et une personnalité (vitesse, goût pour
// les fleurs, bougeotte) retirée au sort après chaque bousculade.
//
// Coordonnées : celles du viewBox du jardin (300 × 190), sol à y = 160.
// Rendu : GardenFauna.jsx lit `pose(agent)` à chaque image.
// =============================================================

export const WORLD = { w: 300, h: 190, ground: 160, skyTop: 24, skyBottom: 132 }
const FLOWER_H = 59        // de la base de la tige au cœur de la fleur
const SWAY_DUR = 3.6       // balancement SMIL des plantes (GrowingGarden.jsx)

const TAU = Math.PI * 2
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const hyp = Math.hypot

// ---- Hasard reproductible (tests) ou libre (app) ----
export function makeRng(seed) {
  if (seed === undefined) return Math.random
  let s = seed >>> 0 || 1
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296 }
}
const between = (rng, [a, b]) => a + rng() * (b - a)
const pick = (rng, list) => list[Math.floor(rng() * list.length)]
function weighted(rng, entries) {
  const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0)
  let r = rng() * total
  for (const [v, w] of entries) { r -= Math.max(0, w); if (r <= 0) return v }
  return entries[entries.length - 1][0]
}

// Bruit lissé 1D dans [-1, 1] : trois sinus aux fréquences et phases tirées
// au sort. Jamais périodique en pratique (rapports irrationnels).
function makeNoise(rng, base) {
  const parts = [1, 2.13, 4.37].map((k, i) => ({
    f: base * k * (0.7 + rng() * 0.6), p: rng() * TAU, a: 1 / (i + 1),
  }))
  const norm = parts.reduce((s, q) => s + q.a, 0)
  return (t) => parts.reduce((s, q) => s + q.a * Math.sin(q.f * t + q.p), 0) / norm
}

// ---- Espèces ----
// orient : 'top' (vu de dessus, tête vers -y : on tourne selon le cap)
//          'side' (vu de profil, tête vers -x : on retourne selon le sens)
export const SPECIES = {
  papillon:     { kind: 'flyer', orient: 'top', speed: 24, accel: 70, noise: 0.5, jitter: 26, flutter: 34, flowerLove: 0.55, restLove: 0.25, leaveLove: 0.08, mass: 0.6, opacity: 0.72 },
  'papillon-dore': { kind: 'flyer', orient: 'top', speed: 20, accel: 60, noise: 0.42, jitter: 22, flutter: 30, flowerLove: 0.6, restLove: 0.3, leaveLove: 0.06, mass: 0.6, opacity: 0.7 },
  abeille:      { kind: 'flyer', orient: 'side', speed: 52, accel: 260, noise: 1.3, jitter: 150, flutter: 0, flowerLove: 0.6, restLove: 0.05, leaveLove: 0.12, hoverLove: 0.3, mass: 0.8, opacity: 0.8 },
  butineuse:    { kind: 'flyer', orient: 'side', speed: 48, accel: 240, noise: 1.2, jitter: 130, flutter: 0, flowerLove: 0.85, restLove: 0.02, leaveLove: 0.05, hoverLove: 0.25, mass: 0.8, opacity: 0.9 },
  libellule:    { kind: 'darter', orient: 'top', speed: 150, accel: 900, noise: 0.9, jitter: 30, flutter: 0, flowerLove: 0.12, restLove: 0.1, leaveLove: 0.1, mass: 0.7, opacity: 0.6 },
  coccinelle:   { kind: 'walker', orient: 'side', speed: 7, accel: 40, noise: 0.8, jitter: 0, flutter: 0, flowerLove: 0.25, restLove: 0, leaveLove: 0, mass: 1, opacity: 0.85 },
  oiseau:       { kind: 'flyer', orient: 'side', speed: 42, accel: 45, noise: 0.25, jitter: 8, flutter: 0, flowerLove: 0, restLove: 0, leaveLove: 0.35, mass: 2.2, opacity: 0.6, bird: true },
}

// Personnalité : retirée au sort à la naissance et après chaque bousculade
function rollMood(rng) {
  return {
    speed: 0.75 + rng() * 0.55,     // plus ou moins vif
    flowers: 0.6 + rng() * 0.8,     // attirance pour les fleurs
    restless: 0.6 + rng() * 0.9,    // change d'idée plus ou moins vite
    wobble: 0.7 + rng() * 0.7,      // vol plus ou moins erratique
  }
}

// ---- Fleurs : position réelle du cœur, balancement SMIL compris ----
// Même animation que Plant : rotate 0 → a → 0 → -0.6a → 0 sur 3,6 s,
// commencée à x × 0,004 s, autour de la base de la tige.
export function flowerHead(f, smilTime = 0) {
  let ang = 0
  const tt = smilTime - f.x * 0.004
  if (tt > 0) {
    const vals = [0, f.angle, 0, -0.6 * f.angle, 0]
    const ph = ((tt % SWAY_DUR) / SWAY_DUR) * 4
    const i = Math.min(3, Math.floor(ph))
    ang = lerp(vals[i], vals[i + 1], ph - i)
  }
  const r = (ang * Math.PI) / 180
  return { x: f.x + Math.sin(r) * FLOWER_H, y: WORLD.ground - Math.cos(r) * FLOWER_H }
}

// =============================================================
export function createFauna({ rng: seedOrRng, onEvent } = {}) {
  const rng = typeof seedOrRng === 'function' ? seedOrRng : makeRng(seedOrRng)
  const agents = new Map()
  let flowers = []            // [{ x, angle }]
  let clock = 0               // secondes écoulées dans le moteur
  let smilNow = () => clock

  const occupied = (fi, self) => [...agents.values()].some((a) => a !== self && a.flower === fi && (a.mode === 'forage' || a.mode === 'toFlower'))
  function freeFlower(self) {
    const free = flowers.map((_, i) => i).filter((i) => !occupied(i, self))
    return free.length ? pick(rng, free) : null
  }

  function spawn(id, species, { inside = true } = {}) {
    const sp = SPECIES[species]
    const a = {
      id, species, sp, mood: rollMood(rng),
      x: 0, y: 0, vx: 0, vy: 0, heading: rng() * TAU, facing: rng() < 0.5 ? -1 : 1,
      rot: 0, spin: 0, tilt: 0, alpha: 0, wing: 0, wingPhase: rng() * TAU, wingsOpen: false,
      mode: 'wander', t: 0, dur: 1, target: null, anchor: null, flower: null, offset: { x: 0, y: 0 },
      nx: makeNoise(rng, sp.noise), ny: makeNoise(rng, sp.noise * 1.13), nf: makeNoise(rng, sp.noise * 3.1),
      hopFrom: null, knocks: 0,
    }
    if (sp.kind === 'walker') {
      a.x = inside ? between(rng, [20, 280]) : (rng() < 0.5 ? -6 : 306)
      a.y = WORLD.ground + between(rng, [0.3, 2.2])
      setMode(a, 'walk')
    } else if (inside) {
      a.x = between(rng, [30, 270]); a.y = between(rng, [WORLD.skyTop + 10, WORLD.skyBottom - 20])
      a.vx = between(rng, [-1, 1]) * sp.speed * 0.3
      decide(a)
    } else {
      enterFromEdge(a)
    }
    agents.set(id, a)
    return a
  }

  function enterFromEdge(a) {
    const left = rng() < 0.5
    a.rot = 0; a.spin = 0; a.tilt = 0
    if (a.sp.kind === 'walker') {             // la coccinelle revient à pied par un bord
      a.x = left ? -5 : WORLD.w + 5
      a.y = WORLD.ground + 1.2; a.vx = 0; a.vy = 0
      a.facing = left ? 1 : -1
      return setMode(a, 'walk', between(rng, [3, 7]))
    }
    a.x = left ? -12 : WORLD.w + 12
    a.y = a.sp.bird ? between(rng, [28, 60]) : between(rng, [WORLD.skyTop + 6, WORLD.skyBottom - 10])
    a.vx = (left ? 1 : -1) * a.sp.speed * 0.8
    a.vy = between(rng, [-6, 6])
    a.rot = 0; a.spin = 0
    setMode(a, 'wander', between(rng, [1.5, 3.5]))
    a.anchor = { x: between(rng, [60, 240]), y: a.y }
  }

  function setMode(a, mode, dur) {
    a.mode = mode; a.t = 0
    a.dur = dur ?? 1
    if (mode !== 'forage' && mode !== 'toFlower' && mode !== 'onFlower') a.flower = null
  }

  // ---- Choix de la prochaine activité (le cœur de l'imprévisibilité) ----
  function decide(a, { afterKnock = false } = {}) {
    const sp = a.sp, m = a.mood
    if (sp.kind === 'walker') {
      const f = flowers.length ? freeFlower(a) : null
      const next = weighted(rng, [
        ['walk', 5], ['pause', 2.5], ['turn', 1.2],
        ['hop', afterKnock ? 2 : 0.7], ['climb', f !== null ? sp.flowerLove * m.flowers * 3 : 0],
      ])
      if (next === 'turn') { a.facing *= -1; return setMode(a, 'walk', between(rng, [1, 4]) / m.restless) }
      if (next === 'walk') return setMode(a, 'walk', between(rng, [1.2, 6]) / m.restless)
      if (next === 'pause') return setMode(a, 'pause', between(rng, [0.4, 3]))
      if (next === 'climb') { a.flower = f; return startHop(a, 'flower') }
      return startHop(a, 'ground')
    }
    const f = flowers.length ? freeFlower(a) : null
    const next = weighted(rng, [
      ['wander', 3 * m.restless],
      ['toFlower', f !== null ? 5 * sp.flowerLove * m.flowers : 0],
      ['rest', 3 * sp.restLove],
      ['hover', 4 * (sp.hoverLove || 0) + (sp.kind === 'darter' ? 4 : 0)],
      ['leave', afterKnock ? sp.leaveLove * 6 : sp.leaveLove * 2],
    ])
    if (next === 'toFlower') { a.flower = f; return setMode(a, 'toFlower', 12) }
    if (next === 'rest') {
      a.target = { x: between(rng, [15, 285]), y: WORLD.ground - between(rng, [1, 7]) }
      return setMode(a, 'toRest', 12)
    }
    if (next === 'hover') return setMode(a, 'hover', between(rng, [0.5, 2.6]))
    if (next === 'leave') {
      a.target = { x: rng() < 0.5 ? -30 : WORLD.w + 30, y: between(rng, [10, 90]) }
      return setMode(a, 'leave', 10)
    }
    // Errance : un point d'ancrage quelque part dans les airs, souvent loin
    a.anchor = {
      x: clamp(a.x + between(rng, [-160, 160]), 20, 280),
      y: sp.bird ? between(rng, [26, 70]) : between(rng, [WORLD.skyTop + 6, WORLD.skyBottom - 8]),
    }
    return setMode(a, 'wander', between(rng, [1.2, 5.5]) / m.restless)
  }

  function startHop(a, where) {
    a.hopFrom = { x: a.x, y: a.y }
    if (where === 'flower' && a.flower !== null) {
      a.target = null
    } else {
      a.flower = null
      a.target = { x: clamp(a.x + between(rng, [-90, 90]), 12, 288), y: WORLD.ground + between(rng, [0.3, 2.2]) }
    }
    a.wingsOpen = true
    a.vy = -between(rng, [18, 30])
    setMode(a, 'hop', 6)
  }

  // ---- Physique commune ----
  function steer(a, tx, ty, speed, accel, dt, arrive = 18) {
    const dx = tx - a.x, dy = ty - a.y, d = hyp(dx, dy) || 1e-6
    const want = speed * Math.min(1, d / arrive)
    const ax = (dx / d) * want - a.vx, ay = (dy / d) * want - a.vy
    const n = hyp(ax, ay) || 1e-6, k = Math.min(1, (accel * dt) / n)
    a.vx += ax * k; a.vy += ay * k
    return d
  }
  function integrate(a, dt) { a.x += a.vx * dt; a.y += a.vy * dt }

  // ---- Une image ----
  function step(dt) {
    dt = Math.min(dt, 0.05)
    clock += dt
    const smil = smilNow()
    for (const a of agents.values()) update(a, dt, smil)
  }

  function update(a, dt, smil) {
    const sp = a.sp, m = a.mood, t = clock
    a.t += dt
    a.alpha = Math.min(1, a.alpha + dt * 1.2)
    const speed = sp.speed * m.speed

    switch (a.mode) {
      // ---------- Voler au hasard ----------
      case 'wander': {
        const r = sp.bird ? 30 : 26 * m.wobble
        const tx = a.anchor.x + a.nx(t) * r, ty = a.anchor.y + a.ny(t) * r * 0.6
        steer(a, tx, ty, speed, sp.accel, dt, 30)
        // à-coups : zigzag de l'abeille, battements du papillon
        a.vx += a.nf(t * 1.7) * sp.jitter * m.wobble * dt
        a.vy += a.nf(t * 2.3 + 5) * sp.jitter * m.wobble * dt
        if (sp.flutter) a.vy -= Math.max(0, Math.sin(a.wingPhase)) * sp.flutter * dt * 2 - sp.flutter * dt * 0.62
        if (a.t > a.dur) decide(a)
        break
      }
      // ---------- Aller butiner ----------
      case 'toFlower': {
        const h = flowerHead(flowers[a.flower] || { x: a.x, angle: 0 }, smil)
        const land = { x: h.x + a.offset.x, y: h.y - (sp.orient === 'top' ? 1.5 : 3) }
        const d = steer(a, land.x, land.y, speed, sp.accel, dt, 22)
        if (d > 8) { a.vx += a.nf(t * 2) * sp.jitter * 0.6 * dt; a.vy += a.nf(t * 2.7 + 3) * sp.jitter * 0.6 * dt }
        if (!flowers[a.flower] || a.t > a.dur) { decide(a); break }
        if (d < 1.3) {
          a.offset = { x: between(rng, [-1.5, 1.5]), y: 0 }
          setMode(a, 'forage', between(rng, sp.orient === 'top' ? [2.5, 8] : [1.2, 4.5]) * (0.6 + m.flowers * 0.5))
          onEvent?.('land', a)
        }
        break
      }
      case 'forage': {
        const f = flowers[a.flower]
        if (!f) { decide(a); break }
        const h = flowerHead(f, smil)
        let ox = a.offset.x, oy = 0
        if (sp.orient === 'side') {   // l'abeille fouille les pétales
          ox += Math.sin(t * 2.9 * m.wobble + a.wingPhase) * 2.2 + a.nf(t) * 0.8
          oy = Math.abs(Math.cos(t * 2.1 + a.wingPhase)) * -1.2
        }
        a.x = h.x + ox; a.y = h.y - (sp.orient === 'top' ? 1.5 : 3) + oy
        a.vx = 0; a.vy = 0
        // le papillon change parfois de place sur la fleur, l'abeille se retourne
        if (rng() < dt * 0.35) { a.offset.x = between(rng, [-2, 2]); if (sp.orient === 'side') a.facing *= -1 }
        if (a.t > a.dur) {
          a.vx = between(rng, [-1, 1]) * speed * 0.5; a.vy = -between(rng, [0.4, 0.9]) * speed
          onEvent?.('takeoff', a)
          decide(a)
        }
        break
      }
      // ---------- Se poser dans l'herbe ----------
      case 'toRest': {
        const d = steer(a, a.target.x, a.target.y, speed * 0.8, sp.accel, dt, 25)
        if (sp.flutter) a.vy -= Math.max(0, Math.sin(a.wingPhase)) * sp.flutter * dt * 1.4 - sp.flutter * dt * 0.45
        if (d < 1.5 || a.t > a.dur) { a.vx = 0; a.vy = 0; setMode(a, 'rest', between(rng, [2, 7]) / m.restless) }
        break
      }
      case 'rest': {
        a.vx = 0; a.vy = 0
        if (a.t > a.dur) { a.vy = -speed * 0.8; a.vx = between(rng, [-1, 1]) * speed * 0.4; decide(a) }
        break
      }
      // ---------- Vol stationnaire (abeille, libellule) ----------
      case 'hover': {
        if (!a.target || a.t < dt * 1.5) a.target = { x: a.x, y: a.y }
        steer(a, a.target.x + a.nx(t * 3) * 1.6, a.target.y + a.ny(t * 3) * 1.2, speed * 0.3, sp.accel, dt, 6)
        if (a.t > a.dur) {
          if (sp.kind === 'darter' && rng() < 0.8) {
            // la libellule file d'un trait vers un autre point
            const ang = rng() * TAU, len = between(rng, [40, 130])
            a.target = { x: clamp(a.x + Math.cos(ang) * len, 15, 285), y: clamp(a.y + Math.sin(ang) * len * 0.5, WORLD.skyTop, WORLD.skyBottom - 10) }
            setMode(a, 'dart', 2.5)
          } else decide(a)
        }
        break
      }
      case 'dart': {
        const d = steer(a, a.target.x, a.target.y, speed * 1.1, sp.accel, dt, 14)
        if (d < 1.5 || a.t > a.dur) { a.target = null; setMode(a, 'hover', between(rng, [0.4, 2.8])) }
        break
      }
      // ---------- Sortir du cadre, revenir plus tard ----------
      case 'leave': {
        steer(a, a.target.x, a.target.y, speed * 1.2, sp.accel, dt, 5)
        if (outside(a, 14) || a.t > a.dur) { setMode(a, 'away', between(rng, [2.5, 9])); a.vx = 0; a.vy = 0 }
        break
      }
      case 'away': {
        if (a.t > a.dur) { a.alpha = 0; enterFromEdge(a) }
        break
      }
      // ---------- Coccinelle ----------
      case 'walk': {
        const gait = Math.max(0.15, 0.65 + a.nx(t * 2) * 0.5)   // trottine, ralentit, repart
        a.vx = a.facing * sp.speed * m.speed * gait; a.vy = 0
        a.x += a.vx * dt
        a.y = WORLD.ground + 1.2 + a.ny(t * 1.5) * 0.9
        if ((a.x < 8 && a.facing < 0) || (a.x > 292 && a.facing > 0)) a.facing *= -1
        if (a.t > a.dur) decide(a)
        break
      }
      case 'pause': {
        a.vx = 0; a.vy = 0
        if (a.t > a.dur) decide(a)
        break
      }
      case 'hop': {
        const dest = a.flower !== null && flowers[a.flower] ? (() => { const h = flowerHead(flowers[a.flower], smil); return { x: h.x, y: h.y - 2.5 } })() : a.target
        if (!dest) { a.wingsOpen = false; setMode(a, 'walk', 2); break }
        // petit vol lourd : monte, puis se laisse guider vers l'arrivée
        const d = steer(a, dest.x, dest.y - (a.t < 0.5 ? 14 : 0), 34, 120, dt, 10)
        a.vy += Math.sin(a.wingPhase) * 30 * dt
        if (d < 1.2 || a.t > a.dur) {
          a.wingsOpen = false; a.vx = 0; a.vy = 0
          if (a.flower !== null && flowers[a.flower]) setMode(a, 'onFlower', between(rng, [2, 8]))
          else { a.y = WORLD.ground + 1.2; setMode(a, 'pause', between(rng, [0.3, 1.5])) }
        }
        break
      }
      case 'onFlower': {
        const f = flowers[a.flower]
        if (!f) { startHop(a, 'ground'); break }
        const h = flowerHead(f, smil)
        a.x = h.x + Math.sin(t * 0.9 + a.wingPhase) * 1.4; a.y = h.y - 2.5
        if (a.t > a.dur) startHop(a, 'ground')
        break
      }
      // ---------- Bousculé ! ----------
      case 'knocked': {
        const g = sp.kind === 'walker' ? 170 : 55
        const drag = Math.exp(-(sp.kind === 'walker' ? 1.1 : 1.7) * dt)
        a.vx *= drag; a.vy = a.vy * drag + g * dt
        a.rot += a.spin * dt
        a.spin *= Math.exp(-2.2 * dt)
        if (a.y > WORLD.ground + 1.5 && a.vy > 0) {       // rebond sur le sol
          a.y = WORLD.ground + 1.5
          a.vy = -a.vy * 0.38; a.vx *= 0.6; a.spin *= -0.5
          if (Math.abs(a.vy) < 12) a.vy = 0
        }
        if (outside(a, 10)) { setMode(a, 'away', between(rng, [2, 7])); a.rot = 0; a.spin = 0; break }
        const slow = hyp(a.vx, a.vy) < (sp.kind === 'walker' ? 6 : 22)
        if ((slow && a.t > 0.45) || a.t > 2.6) {
          a.dazedFrom = a.rot
          setMode(a, 'dazed', between(rng, [0.45, 1.2]))
        }
        break
      }
      case 'dazed': {
        // secoue la tête, se remet d'aplomb, puis repart avec une nouvelle idée
        const k = Math.min(1, a.t / a.dur)
        const upright = Math.round(a.dazedFrom / 360) * 360
        a.rot = lerp(a.dazedFrom, upright, 1 - Math.pow(1 - k, 3)) + Math.sin(a.t * 26) * 9 * (1 - k)
        a.vx *= Math.exp(-6 * dt); a.vy *= Math.exp(-6 * dt)
        if (sp.kind !== 'walker') a.vy -= 10 * dt   // reprend de l'altitude
        if (a.t > a.dur) {
          a.rot = 0; a.spin = 0
          a.mood = rollMood(rng)                     // nouvelle personnalité
          a.nx = makeNoise(rng, sp.noise); a.ny = makeNoise(rng, sp.noise * 1.13); a.nf = makeNoise(rng, sp.noise * 3.1)
          if (sp.kind === 'walker') { a.y = Math.min(a.y, WORLD.ground + 1.5); a.facing = rng() < 0.5 ? -1 : 1 }
          onEvent?.('recover', a)
          decide(a, { afterKnock: true })
        }
        break
      }
      default: decide(a)
    }

    if (a.mode !== 'forage' && a.mode !== 'onFlower' && a.mode !== 'walk') integrate(a, dt)
    if (a.sp.kind !== 'walker' && !['knocked', 'dazed', 'leave', 'away', 'forage', 'rest'].includes(a.mode)) {
      // garde-fous doux : ne pas s'enfoncer dans le sol ni sortir par le haut
      if (a.y > WORLD.ground - 2 && a.mode !== 'toRest') a.vy -= 160 * dt
      if (a.y < WORLD.skyTop - 6) a.vy += 90 * dt
      if (a.mode !== 'wander' || !a.sp.bird) {
        if (a.x < -4) a.vx += 120 * dt
        if (a.x > WORLD.w + 4) a.vx -= 120 * dt
      }
    }

    // Ailes : fréquence irrégulière en vol, lente et rare posé
    const flying = !['forage', 'rest', 'walk', 'pause', 'onFlower', 'away'].includes(a.mode)
    const wingHz = sp.orient === 'top'
      ? (flying ? 3.2 + a.nf(t * 0.7) * 1.4 : 0.35 + Math.max(0, a.nf(t * 0.4)) * 0.5)
      : (flying ? 5 : 0.8)
    a.wingPhase += TAU * wingHz * dt
    a.wing = flying ? (0.5 + 0.5 * Math.sin(a.wingPhase)) : Math.max(0, Math.sin(a.wingPhase)) ** 3 * 0.8

    // Orientation lissée
    const sp2 = hyp(a.vx, a.vy)
    if (sp.orient === 'top') {
      if (sp2 > 4 && a.mode !== 'knocked' && a.mode !== 'dazed') {
        const want = Math.atan2(a.vy, a.vx) + Math.PI / 2
        let d = want - a.heading
        d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI
        a.heading += d * Math.min(1, dt * (sp.kind === 'darter' ? 14 : 5))
      }
    } else {
      if (Math.abs(a.vx) > 3 && a.mode !== 'knocked') a.facing = a.vx > 0 ? 1 : -1
      const wantTilt = a.sp.kind === 'walker' ? 0 : clamp(a.vy * 0.6, -28, 28)
      a.tilt = lerp(a.tilt, wantTilt, Math.min(1, dt * 6))
    }
  }

  const outside = (a, margin) => a.x < -margin || a.x > WORLD.w + margin || a.y < -margin || a.y > WORLD.h + margin

  // ---- Toucher : les insectes proches sont envoyés bouler ----
  // (px, py) en coordonnées du jardin. Renvoie le nombre d'insectes touchés.
  function knock(px, py, radius = 70) {
    let hits = 0
    for (const a of agents.values()) {
      if (a.mode === 'away' || a.alpha < 0.3) continue
      const dx = a.x - px, dy = a.y - py, d = hyp(dx, dy)
      if (d > radius) continue
      hits++
      const power = Math.pow(1 - d / radius, 0.6) * (d < 10 ? 1.25 : 1)
      if (a.sp.bird) {                         // l'oiseau ne tournoie pas : il s'enfuit
        a.target = { x: dx < 0 ? -40 : WORLD.w + 40, y: between(rng, [0, 30]) }
        a.vx = Math.sign(dx || 1) * 90; a.vy = -50
        setMode(a, 'leave', 6)
        continue
      }
      let ang = Math.atan2(dy || -1, dx || (rng() - 0.5)) + between(rng, [-0.6, 0.6])
      let ux = Math.cos(ang), uy = Math.sin(ang) - 0.55   // vers le haut, surtout
      const n = hyp(ux, uy); ux /= n; uy /= n
      const v = between(rng, [150, 230]) * (0.45 + power * 0.8) / Math.sqrt(a.sp.mass)
      a.vx = ux * v; a.vy = uy * v
      a.spin = (rng() < 0.5 ? -1 : 1) * between(rng, [540, 1150]) * (0.5 + power * 0.6)
      a.wingsOpen = false; a.flower = null; a.knocks++
      setMode(a, 'knocked', 3)
      onEvent?.('knock', a)
    }
    return hits
  }

  // Pose immobile (« réduire les animations ») : posés, sans mouvement
  function settle() {
    let i = 0
    for (const a of agents.values()) {
      a.alpha = 1; a.rot = 0; a.spin = 0; a.vx = 0; a.vy = 0
      if (a.sp.kind === 'walker') { a.y = WORLD.ground + 1.2; setMode(a, 'pause', 1e9); continue }
      const f = flowers[i % Math.max(1, flowers.length)]
      if (f && !a.sp.bird && i < flowers.length) {
        const h = flowerHead(f, 0); a.flower = i % flowers.length
        a.x = h.x; a.y = h.y - 2; setMode(a, 'forage', 1e9); a.offset = { x: 0, y: 0 }
      } else {
        a.x = 40 + ((i * 67) % 220); a.y = a.sp.bird ? 40 : 70 + (i % 3) * 12; setMode(a, 'rest', 1e9)
      }
      i++
    }
  }

  return {
    agents,
    spawn,
    remove: (id) => agents.delete(id),
    setFlowers(list) {
      const before = flowers
      flowers = list
      // une fleur a disparu : ceux qui s'y dirigeaient changent d'idée
      if (before.length !== list.length) for (const a of agents.values()) if (a.flower !== null && !list[a.flower]) a.flower = null
    },
    setClock(fn) { smilNow = fn },
    step, knock, settle,
    get time() { return clock },
  }
}

// Transformation SVG d'un agent (appelée à chaque image par le rendu)
export function pose(a) {
  let r = a.rot, sx = 1
  if (a.sp.orient === 'top') r += (a.heading * 180) / Math.PI
  else { sx = a.facing > 0 ? -1 : 1; r += a.tilt * (a.facing > 0 ? 1 : -1) }
  return `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${r.toFixed(1)}) scale(${sx} 1)`
}
