// =============================================================
// Boîte d'envoi de la synchronisation
//
// Chaque modification locale (épisode, raccourci, ressenti, profil) est notée
// ici jusqu'à ce que le serveur l'ait reçue. La boîte est stockée sur
// l'appareil : une modification faite hors ligne, ou juste avant de fermer
// l'app, sera envoyée à la prochaine connexion.
// Inactive en mode 100 % local.
// =============================================================
import { currentAccountId } from './auth'
import { isRemoteMode } from './remote'

const TYPES = ['episodes', 'shortcuts', 'feelings']
const key = () => `pousse.${currentAccountId()}.outbox.v1`
const cursorKey = () => `pousse.${currentAccountId()}.syncCursor.v1`
const listeners = new Set()

const empty = () => ({ episodes: {}, shortcuts: {}, feelings: {}, profile: null })

export function readOutbox() {
  try {
    const raw = localStorage.getItem(key())
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch { return empty() }
}
function writeOutbox(box) {
  localStorage.setItem(key(), JSON.stringify(box))
}

// op : 'upsert' | 'delete' ; at : date de la modification (ISO)
export function track(type, id, op = 'upsert', at = new Date().toISOString()) {
  if (!isRemoteMode() || !currentAccountId()) return
  const box = readOutbox()
  if (type === 'profile') box.profile = { at }
  else box[type][id] = { op, at }
  try { writeOutbox(box) } catch { /* stockage plein : la modification reste locale */ }
  listeners.forEach((fn) => fn())
}

export function pendingCount(box = readOutbox()) {
  return TYPES.reduce((n, t) => n + Object.keys(box[t]).length, 0) + (box.profile ? 1 : 0)
}

// Retire de la boîte ce qui a été envoyé, sauf si l'élément a été
// modifié à nouveau pendant l'envoi (sa date a changé).
export function clearSent(sent) {
  const box = readOutbox()
  for (const t of TYPES) {
    for (const [id, entry] of Object.entries(sent[t] || {})) {
      if (box[t][id] && box[t][id].at === entry.at) delete box[t][id]
    }
  }
  if (sent.profile && box.profile && box.profile.at === sent.profile.at) box.profile = null
  writeOutbox(box)
}

export function onOutboxChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getCursor = () => localStorage.getItem(cursorKey()) || '0'
export const setCursor = (c) => localStorage.setItem(cursorKey(), String(c))
