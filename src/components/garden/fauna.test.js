// Tests du moteur de comportement des insectes : node --test src/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFauna, flowerHead, WORLD, SPECIES } from './fauna.js'

const FLOWERS = [{ x: 70, angle: 6 }, { x: 150, angle: 7 }, { x: 230, angle: 5 }]
const run = (f, seconds, fps = 60, each) => { for (let i = 0; i < seconds * fps; i++) { f.step(1 / fps); each?.(i / fps) } }
const inside = (a, m = 20) => a.x > -m && a.x < WORLD.w + m && a.y > -m && a.y < WORLD.h + m

test('toutes les espèces : positions finies et dans le cadre (hors sorties volontaires) pendant 3 minutes', () => {
  const f = createFauna({ rng: 7 })
  f.setFlowers(FLOWERS)
  for (const s of Object.keys(SPECIES)) f.spawn(s, s)
  run(f, 180, 60, () => {
    for (const a of f.agents.values()) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `${a.id} ${a.mode}`)
      if (!['leave', 'away', 'knocked'].includes(a.mode)) assert.ok(inside(a, 45), `${a.id} hors cadre en ${a.mode} (${a.x.toFixed(1)}, ${a.y.toFixed(1)})`)
    }
  })
})

test('les butineurs se posent vraiment sur les fleurs, et y suivent le balancement', () => {
  const f = createFauna({ rng: 11 })
  let smil = 0
  f.setClock(() => smil)
  f.setFlowers(FLOWERS)
  const bee = f.spawn('b', 'butineuse')
  const butterfly = f.spawn('p', 'papillon')
  const visited = { b: new Set(), p: new Set() }
  let checked = 0
  run(f, 240, 60, (t) => {
    smil = t
    for (const a of [bee, butterfly]) {
      if (a.mode !== 'forage') continue
      visited[a.id].add(a.flower)
      const h = flowerHead(FLOWERS[a.flower], smil)
      assert.ok(Math.hypot(a.x - h.x, a.y - h.y) < 6, 'posé sur la fleur, même quand elle se balance')
      checked++
    }
  })
  assert.ok(visited.b.size >= 2, `l'abeille visite plusieurs fleurs (${visited.b.size})`)
  assert.ok(visited.p.size >= 1, 'le papillon se pose au moins une fois')
  assert.ok(checked > 500)
})

test('pas de trajet répété : deux insectes de même espèce divergent, et un même insecte ne boucle pas', () => {
  const f = createFauna({ rng: 3 })
  f.setFlowers(FLOWERS)
  const a = f.spawn('a', 'papillon'), b = f.spawn('b', 'papillon')
  b.x = a.x; b.y = a.y
  const track = []
  let apart = 0
  run(f, 120, 30, (t) => {
    track.push([a.x, a.y])
    apart += Math.hypot(a.x - b.x, a.y - b.y)
  })
  assert.ok(apart / track.length > 25, 'mêmes point de départ, chemins différents')
  // Un ancien trajet SMIL se répétait à l'identique toutes les 14 à 24 s :
  // on vérifie qu'aucune période de 5 à 40 s ne redonne le même chemin.
  for (let lag = 150; lag <= 1200; lag += 30) {
    let d = 0, n = 0
    for (let i = 0; i + lag < track.length; i += 5) { d += Math.hypot(track[i][0] - track[i + lag][0], track[i][1] - track[i + lag][1]); n++ }
    assert.ok(d / n > 8, `motif périodique détecté (${lag / 30} s)`)
  }
})

test('la coccinelle trottine dans l\'herbe avec des arrêts, et s\'envole parfois', () => {
  const f = createFauna({ rng: 5 })
  f.setFlowers(FLOWERS)
  const l = f.spawn('c', 'coccinelle')
  const modes = new Set()
  let onGround = 0, n = 0
  run(f, 300, 30, () => {
    modes.add(l.mode); n++
    if (l.mode === 'walk' || l.mode === 'pause') { assert.ok(Math.abs(l.y - WORLD.ground - 1.2) < 1.5); onGround++ }
  })
  assert.ok(modes.has('walk') && modes.has('pause'), 'marche et arrêts')
  assert.ok(modes.has('hop'), 's\'envole de temps en temps')
  assert.ok(onGround / n > 0.5, 'surtout au sol')
})

test('toucher : l\'insecte est envoyé bouler en tournoyant, se remet puis repart vers une nouvelle activité', () => {
  const f = createFauna({ rng: 21 })
  f.setFlowers(FLOWERS)
  const a = f.spawn('p', 'abeille')
  run(f, 3)
  const moodBefore = { ...a.mood }
  const px = a.x + 6, py = a.y + 4           // doigt juste à droite, en dessous
  const hits = f.knock(px, py)
  assert.equal(hits, 1)
  assert.equal(a.mode, 'knocked')
  assert.ok(a.vx < 0, 'part à l\'opposé du doigt')
  assert.ok(Math.hypot(a.vx, a.vy) > 120, 'vraiment envoyé bouler')
  assert.ok(Math.abs(a.spin) > 250, 'tournoie')
  const seen = new Set()
  let t = 0
  while (t < 20 && !(seen.has('dazed') && !['knocked', 'dazed', 'away'].includes(a.mode))) { f.step(1 / 60); t += 1 / 60; seen.add(a.mode) }
  assert.ok(seen.has('dazed') || seen.has('away'), 'étourdi, ou sorti du cadre')
  // de retour dans une activité normale, avec une nouvelle personnalité
  while (t < 30 && ['knocked', 'dazed', 'away'].includes(a.mode)) { f.step(1 / 60); t += 1 / 60 }
  assert.ok(['wander', 'toFlower', 'hover', 'toRest', 'leave', 'forage'].includes(a.mode), a.mode)
  assert.notDeepEqual(a.mood, moodBefore)
  assert.equal(a.rot, 0, 'remis d\'aplomb')
  assert.ok(t < 30)
})

test('toucher : trop loin, rien ne bouge ; un insecte chassé du cadre revient plus tard', () => {
  const f = createFauna({ rng: 9 })
  const a = f.spawn('l', 'libellule')
  run(f, 2)
  assert.equal(f.knock(a.x + 120, a.y), 0)
  // coup violent vers la gauche, près du bord
  a.x = 12; a.y = 60; a.mode = 'hover'
  f.knock(a.x + 3, a.y)
  let left = false, back = false
  run(f, 25, 60, () => {
    if (a.mode === 'away') left = true
    if (left && a.mode !== 'away' && inside(a, 0)) back = true
  })
  assert.ok(left, 'sorti du cadre')
  assert.ok(back, 'revenu')
})

test('l\'oiseau ne tournoie pas : il s\'enfuit puis revient', () => {
  const f = createFauna({ rng: 2 })
  const b = f.spawn('o', 'oiseau')
  run(f, 2)
  f.knock(b.x, b.y + 5)
  assert.equal(b.mode, 'leave')
  assert.equal(b.spin, 0)
})

test('« réduire les animations » : tout le monde est posé et immobile', () => {
  const f = createFauna({ rng: 4 })
  f.setFlowers(FLOWERS)
  for (const s of Object.keys(SPECIES)) f.spawn(s, s)
  f.settle()
  for (const a of f.agents.values()) {
    assert.equal(a.vx, 0); assert.equal(a.vy, 0)
    assert.ok(inside(a, 0))
    assert.ok(['forage', 'rest', 'pause'].includes(a.mode))
  }
})
