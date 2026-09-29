// =============================================================
// Synchronisation avec le serveur (mode en ligne uniquement)
//
// Principe « hors ligne d'abord » : l'application lit et écrit toujours sur
// l'appareil (rapide, utilisable sans réseau). Ce module :
//   1. envoie la boîte d'envoi (modifications pas encore reçues par le serveur) ;
//   2. récupère ce qui a changé ailleurs depuis le dernier curseur ;
//   3. fusionne : la modification la plus récente (updatedAt) l'emporte ;
//   4. vide la boîte d'envoi de ce que le serveur a bien reçu.
// Déclenchement : après chaque modification (1,5 s), au retour du réseau,
// au retour dans l'application et toutes les minutes.
// =============================================================
import { api, ApiError, isRemoteMode } from './remote'
import { readOutbox, clearSent, pendingCount, onOutboxChange, getCursor, setCursor, track } from './outbox'
import { getSession } from './auth'
import {
  loadEpisodes, loadShortcuts, loadCycleLogs, readProfileRaw,
  writeEpisodesRaw, writeShortcutsRaw, writeCycleLogsRaw, writeProfileRaw, saveProfile,
} from './storage'

const BATCH = 1000
let status = { state: 'idle', lastSyncAt: null, pending: 0, error: null }
const statusListeners = new Set()
let running = null
let timer = null
let cleanup = null

function setStatus(patch) {
  status = { ...status, ...patch, pending: pendingCount() }
  statusListeners.forEach((fn) => fn(status))
}
export const getSyncStatus = () => ({ ...status, pending: pendingCount() })
export function onSyncStatus(fn) {
  statusListeners.add(fn)
  return () => statusListeners.delete(fn)
}

const isOnlineSession = () => isRemoteMode() && getSession()?.remote

// ---- Préparation de l'envoi (par lots de BATCH éléments) ----
function buildChanges(box) {
  const sent = { episodes: {}, shortcuts: {}, feelings: {}, profile: null }
  const changes = {}
  const pick = (type, find, keyName) => {
    const out = []
    for (const [k, entry] of Object.entries(box[type]).slice(0, BATCH)) {
      sent[type][k] = entry
      const rec = entry.op === 'delete' ? null : find(k)
      out.push(rec
        ? { [keyName]: k, data: rec, updatedAt: rec.updatedAt || entry.at }
        : { [keyName]: k, deleted: true, updatedAt: entry.at })
    }
    if (out.length) changes[type] = out
  }
  const eps = loadEpisodes(), shs = loadShortcuts(), logs = loadCycleLogs()
  pick('episodes', (id) => eps.find((e) => e.id === id), 'id')
  pick('shortcuts', (id) => shs.find((s) => s.id === id), 'id')
  pick('feelings', (day) => logs.find((l) => l.day === day), 'day')
  if (box.profile) {
    const p = readProfileRaw()
    if (p) {
      changes.profile = { data: p, updatedAt: p.updatedAt || box.profile.at }
      sent.profile = box.profile
    }
  }
  return { changes, sent }
}

// ---- Fusion de ce que renvoie le serveur ----
// Comparaison insensible à l'ordre des clés (PostgreSQL réordonne le JSON)
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  return JSON.stringify(v)
}

function mergeList(local, remote, keyName, pending) {
  if (!remote.length) return null
  const map = new Map(local.map((x) => [x[keyName], x]))
  let changed = false
  for (const r of remote) {
    const k = r[keyName]
    const cur = map.get(k)
    const localAt = pending[k]?.at || cur?.updatedAt || ''
    // Version locale plus récente (ou modification encore en attente d'envoi) : on la garde
    if ((pending[k] || cur) && localAt > r.updatedAt) continue
    if (r.deleted) {
      if (map.delete(k)) changed = true
    } else {
      const next = { ...r.data, [keyName]: k, updatedAt: r.updatedAt }
      if (stable(cur) !== stable(next)) { map.set(k, next); changed = true }
    }
  }
  return changed ? [...map.values()] : null
}

function applyRemote(res) {
  const box = readOutbox()
  let changed = false
  const eps = mergeList(loadEpisodes(), res.episodes, 'id', box.episodes)
  if (eps) { writeEpisodesRaw(eps.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))); changed = true }
  const shs = mergeList(loadShortcuts(), res.shortcuts, 'id', box.shortcuts)
  if (shs) { writeShortcutsRaw(shs); changed = true }
  const logs = mergeList(loadCycleLogs(), res.feelings, 'day', box.feelings)
  if (logs) { writeCycleLogsRaw(logs.sort((a, b) => a.day.localeCompare(b.day))); changed = true }
  if (res.profile) {
    const local = readProfileRaw()
    const localAt = box.profile?.at || local?.updatedAt || ''
    if (!local || res.profile.updatedAt > localAt) {
      writeProfileRaw({ ...res.profile.data, updatedAt: res.profile.updatedAt })
      changed = true
    }
  }
  if (changed) window.dispatchEvent(new CustomEvent('pousse:data-synced'))
}

// ---- Cycle complet ----
export function syncNow() {
  if (!isOnlineSession()) return Promise.resolve(status)
  if (running) return running
  running = (async () => {
    setStatus({ state: 'syncing', error: null })
    try {
      // Plusieurs lots si la boîte d'envoi est volumineuse (ex. après un import)
      for (let round = 0; round < 50; round++) {
        const { changes, sent } = buildChanges(readOutbox())
        const res = await api('POST', '/api/sync', { cursor: getCursor(), changes })
        clearSent(sent)
        applyRemote(res)
        setCursor(res.cursor)
        if (pendingCount() === 0 || Object.keys(changes).length === 0) break
      }
      setStatus({ state: 'ok', lastSyncAt: new Date().toISOString() })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setStatus({ state: 'error', error: 'Session expirée' })
        window.dispatchEvent(new CustomEvent('pousse:session-expired'))
      } else if (e instanceof ApiError && e.status === 403 && e.code === 'consent_required') {
        // Compte sans accord valide sur les données de santé : l'app affiche l'écran d'accord
        setStatus({ state: 'error', error: e.message })
        window.dispatchEvent(new CustomEvent('pousse:consent-required'))
      } else if (e instanceof ApiError && e.status === 0) {
        setStatus({ state: 'offline', error: null })
      } else {
        setStatus({ state: 'error', error: e.message || 'Erreur de synchronisation' })
      }
    } finally {
      running = null
    }
    return status
  })()
  return running
}

export function scheduleSync(delay = 1500) {
  clearTimeout(timer)
  timer = setTimeout(() => { syncNow() }, delay)
}

// Démarre la synchronisation automatique (appelé à l'ouverture d'une session en ligne)
export function startSync() {
  if (!isOnlineSession() || cleanup) return
  const offOutbox = onOutboxChange(() => { setStatus({}); scheduleSync() })
  const onOnline = () => syncNow()
  const onVisible = () => { if (document.visibilityState === 'visible') syncNow() }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  const interval = setInterval(() => { if (document.visibilityState === 'visible') syncNow() }, 60000)
  cleanup = () => {
    offOutbox()
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    clearInterval(interval)
    clearTimeout(timer)
    cleanup = null
  }
  syncNow()
}

export function stopSync() {
  if (cleanup) cleanup()
  status = { state: 'idle', lastSyncAt: null, pending: 0, error: null }
}

// ---- Reprise des données d'un compte local de cet appareil ----
// Copie épisodes, ressentis et raccourcis (sans doublon) dans le compte en
// ligne ; reprend aussi le profil si le compte en ligne est encore vide.
// Tout est ensuite envoyé au serveur par la synchronisation.
export function importLocalAccount(localAccountId) {
  const read = (k) => { try { return JSON.parse(localStorage.getItem(`pousse.${localAccountId}.${k}.v1`) || 'null') } catch { return null } }
  const at = new Date().toISOString()
  const current = loadEpisodes()
  const wasEmpty = current.length === 0

  const ids = new Set(current.map((e) => e.id))
  const newEps = (read('episodes') || []).filter((e) => e && e.id && !ids.has(e.id)).map((e) => ({ ...e, updatedAt: at }))
  writeEpisodesRaw([...current, ...newEps].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))))
  newEps.forEach((e) => track('episodes', e.id, 'upsert', at))

  const logs = loadCycleLogs()
  const days = new Set(logs.map((l) => l.day))
  const newLogs = (read('cycleLogs') || []).filter((l) => l && l.day && !days.has(l.day)).map((l) => ({ ...l, updatedAt: at }))
  writeCycleLogsRaw([...logs, ...newLogs].sort((a, b) => a.day.localeCompare(b.day)))
  newLogs.forEach((l) => track('feelings', l.day, 'upsert', at))

  const shs = loadShortcuts()
  const sids = new Set(shs.map((s) => s.id))
  const newShs = (read('shortcuts') || []).filter((s) => s && s.id && !sids.has(s.id)).map((s) => ({ ...s, updatedAt: at }))
  writeShortcutsRaw([...shs, ...newShs])
  newShs.forEach((s) => track('shortcuts', s.id, 'upsert', at))

  const localProfile = read('profile')
  let profile = false
  if (wasEmpty && localProfile) { saveProfile(localProfile); profile = true }

  window.dispatchEvent(new CustomEvent('pousse:data-synced'))
  return { episodes: newEps.length, feelings: newLogs.length, shortcuts: newShs.length, profile }
}
