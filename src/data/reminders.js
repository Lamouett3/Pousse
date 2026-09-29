// =============================================================
// Rappel du soir : « moment d'écoute ».
//
// Désactivé par défaut. Réglé appareil par appareil (Profil) :
// - mode « push » (sauvegarde en ligne + navigateur compatible + serveur
//   configuré) : le serveur envoie la notification, même app fermée ;
// - mode « local » (sinon) : la notification n'est montrée que si Pousse est
//   ouvert (ou en arrière-plan) à l'heure choisie. Honnête mais limité.
// Dans les deux cas : rien si le ressenti du jour est déjà noté, et jamais
// plus de 2 heures après l'heure choisie.
// =============================================================
import { isRemoteMode, api } from './remote'
import { currentAccountId } from './auth'
import { dayKey } from './storage'

export const DEFAULT_TIME = '20:30'
const WINDOW_MIN = 120

// Même esprit que server/src/reminders.js : doux, sans culpabiliser.
const MESSAGES = [
  { title: 'Un moment pour toi', body: 'La journée touche à sa fin. Prends un instant pour écouter ton corps : comment te sens-tu ce soir ?' },
  { title: 'Une pause, une respiration', body: 'Que ta journée ait été douce ou difficile, ton ressenti compte. Quelques secondes suffisent.' },
  { title: 'Ton jardin t\u2019attend', body: 'Note comment tu te sens aujourd\u2019hui, que ça aille bien ou moins bien. C\u2019est ton moment d\u2019écoute.' },
  { title: 'Et toi, comment vas-tu ?', body: 'Avant de tourner la page de la journée, un petit moment d\u2019attention pour ton corps.' },
  { title: 'Moment d\u2019écoute', body: 'Ferme les yeux un instant. Qu\u2019est-ce que ton corps te dit ce soir ?' },
]

export class ReminderError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

// ---- Préférences (par compte ET par appareil : jamais synchronisées) ----
const prefsKey = () => `pousse.${currentAccountId() || 'anon'}.reminder.v1`
const DEFAULT_PREFS = { enabled: false, time: DEFAULT_TIME, mode: null, endpoint: null, lastLocalDay: null }

export function getReminderPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(prefsKey()) || '{}') } } catch { return { ...DEFAULT_PREFS } }
}
function savePrefs(patch) {
  const next = { ...getReminderPrefs(), ...patch }
  try { localStorage.setItem(prefsKey(), JSON.stringify(next)) } catch { /* stockage plein */ }
  listeners.forEach((fn) => fn(next))
  return next
}
const listeners = new Set()
export function onReminderChange(fn) { listeners.add(fn); return () => listeners.delete(fn) }

// ---- Ce que permet l'appareil ----
export function reminderSupport() {
  const hasWindow = typeof window !== 'undefined'
  const notifications = hasWindow && 'Notification' in window
  const sw = hasWindow && 'serviceWorker' in navigator
  const push = sw && 'PushManager' in window
  const ua = hasWindow ? navigator.userAgent : ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (hasWindow && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = hasWindow && (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)
  return {
    notifications,
    push,
    // Sur iPhone et iPad, les notifications Web exigent que Pousse soit ajouté à l'écran d'accueil
    iosNeedsInstall: ios && !standalone,
    permission: notifications ? Notification.permission : 'unsupported',
  }
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
  ])
}

function b64urlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const timezone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris' } catch { return 'Europe/Paris' } }

// Abonnement push auprès du serveur. Renvoie l'endpoint, ou null si le push
// n'est pas possible ici (on bascule alors en mode local).
async function subscribePush(time) {
  if (!isRemoteMode() || !reminderSupport().push) return null
  let key
  try { key = (await api('GET', '/api/push/key')).publicKey } catch { return null }
  if (!key) return null
  const reg = await registration()
  if (!reg?.pushManager) return null
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) })
    } catch {
      return null   // service de push injoignable (navigateur sans services Google, mode privé…)
    }
  }
  const json = sub.toJSON()
  await api('POST', '/api/push/subscription', {
    subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
    time, timezone: timezone(),
  })
  return json.endpoint
}

// À appeler depuis un geste de l'utilisateur (toucher l'interrupteur) : c'est
// la condition des navigateurs pour demander l'autorisation.
export async function enableReminder(time = getReminderPrefs().time) {
  const support = reminderSupport()
  if (!support.notifications) {
    throw new ReminderError('unsupported', support.iosNeedsInstall
      ? 'Sur iPhone, ajoute d\u2019abord Pousse à ton écran d\u2019accueil (Partager, puis « Sur l\u2019écran d\u2019accueil »).'
      : 'Ce navigateur ne permet pas les notifications.')
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new ReminderError('denied', 'Les notifications sont bloquées pour Pousse. Autorise-les dans les réglages du navigateur, puis réessaie.')
  }
  const endpoint = await subscribePush(time)
  return savePrefs({ enabled: true, time, mode: endpoint ? 'push' : 'local', endpoint, lastLocalDay: alreadyPastToday(time) })
}

// Heure déjà passée aujourd'hui : le premier rappel sera pour demain
function alreadyPastToday(time, now = new Date()) {
  const [h, m] = time.split(':').map(Number)
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m ? dayKey(now) : null
}

export async function setReminderTime(time) {
  const prefs = getReminderPrefs()
  if (!prefs.enabled) return savePrefs({ time })
  if (prefs.mode === 'push') {
    const endpoint = await subscribePush(time)
    return savePrefs({ time, mode: endpoint ? 'push' : 'local', endpoint, lastLocalDay: alreadyPastToday(time) })
  }
  return savePrefs({ time, lastLocalDay: alreadyPastToday(time) })
}

export async function disableReminder() {
  const prefs = getReminderPrefs()
  savePrefs({ enabled: false, mode: null, endpoint: null })
  if (prefs.mode !== 'push') return
  try {
    const reg = await registration()
    const sub = await reg?.pushManager?.getSubscription()
    const endpoint = sub?.endpoint || prefs.endpoint
    if (endpoint) await api('DELETE', '/api/push/subscription', { endpoint }).catch(() => {})
    await sub?.unsubscribe()
  } catch { /* hors ligne : le serveur oubliera l'abonnement quand le navigateur le révoquera */ }
}

// Déconnexion : l'appareil ne doit plus recevoir de rappel pour ce compte
export async function stopRemindersOnLogout() {
  if (getReminderPrefs().mode === 'push') await disableReminder()
}

function pickMessage() { return MESSAGES[Math.floor(Math.random() * MESSAGES.length)] }

// Renvoie true si la notification a été affichée
async function showLocal() {
  const m = pickMessage()
  const options = { body: m.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'pousse-ecoute', lang: 'fr', data: { url: '/?ecoute=1' } }
  if ('serviceWorker' in navigator) {
    const reg = await registration()
    if (!reg?.showNotification) return false     // service worker pas encore prêt : on réessaiera
    await reg.showNotification(m.title, options)
    return true
  }
  const n = new Notification(m.title, options)   // navigateur sans service worker
  n.onclick = () => { window.focus(); window.dispatchEvent(new CustomEvent('pousse:ecoute')); n.close() }
  return true
}

// « Essayer » : un rappel tout de suite, par le même chemin que le vrai
export async function testReminder() {
  const prefs = getReminderPrefs()
  if (prefs.mode === 'push' && prefs.endpoint) {
    await api('POST', '/api/push/test', { endpoint: prefs.endpoint })
    return 'push'
  }
  if (!(await showLocal())) throw new Error('L\u2019application finit de se charger. Réessaie dans un instant.')
  return 'local'
}

// Heure « HH:MM » atteinte aujourd'hui, et pas plus de 2 h après
export function isInReminderWindow(time, now = new Date()) {
  const [h, m] = time.split(':').map(Number)
  const minutes = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
  return minutes >= 0 && minutes < WINDOW_MIN
}

// Mode local : vérification régulière tant que l'app est ouverte
export function startLocalReminders(hasFeelingToday) {
  let busy = false
  const check = async () => {
    const prefs = getReminderPrefs()
    if (busy || !prefs.enabled || prefs.mode !== 'local') return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const today = dayKey(new Date())
    if (prefs.lastLocalDay === today || !isInReminderWindow(prefs.time)) return
    if (hasFeelingToday()) { savePrefs({ lastLocalDay: today }); return }
    busy = true
    try {
      // La journée n'est marquée qu'une fois la notification vraiment affichée
      if (await showLocal()) savePrefs({ lastLocalDay: today })
    } catch { /* on réessaiera au prochain passage */ } finally { busy = false }
  }
  const t = setInterval(check, 30 * 1000)
  document.addEventListener('visibilitychange', check)
  check()
  navigator.serviceWorker?.ready.then(() => check())   // dès que le service worker est prêt
  return () => { clearInterval(t); document.removeEventListener('visibilitychange', check) }
}
