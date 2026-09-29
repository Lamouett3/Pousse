// =============================================================
// Profil : « Moment d'écoute », le rappel du soir (désactivé par défaut).
// Voir src/data/reminders.js pour le fonctionnement.
// =============================================================
import { useEffect, useState } from 'react'
import { colors, radius, shadow, type, TOUCH_MIN } from '../theme/tokens'
import { Toggle } from './ui'
import {
  getReminderPrefs, onReminderChange, reminderSupport, enableReminder, disableReminder,
  setReminderTime, testReminder, ReminderError,
} from '../data/reminders'
import { isRemoteMode } from '../data/remote'

export default function EveningReminder({ toast, wide }) {
  const [prefs, setPrefs] = useState(getReminderPrefs)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const support = reminderSupport()
  useEffect(() => onReminderChange(setPrefs), [])

  async function toggle() {
    setError(''); setBusy(true)
    try {
      if (prefs.enabled) {
        await disableReminder()
        toast('Rappel du soir désactivé', 'success')
      } else {
        const p = await enableReminder(prefs.time)
        toast(`Rappel activé : chaque jour à ${p.time.replace(':', ' h ')}`, 'success')
      }
    } catch (e) {
      setError(e instanceof ReminderError ? e.message : (e.message || 'Impossible d\u2019activer le rappel'))
    }
    setBusy(false)
  }

  async function changeTime(time) {
    if (!/^\d{2}:\d{2}$/.test(time)) return
    setError('')
    try { await setReminderTime(time) } catch (e) { setError(e.message || 'Heure non enregistrée') }
  }

  async function tryIt() {
    setError(''); setBusy(true)
    try {
      await testReminder()
      toast('Rappel d\u2019essai envoyé', 'success')
    } catch (e) {
      setError(e.message || 'Envoi impossible')
    }
    setBusy(false)
  }

  const blocked = prefs.enabled && support.permission === 'denied'
  const localOnly = prefs.enabled && prefs.mode === 'local'

  return (
    <section aria-labelledby="reminder-title" style={{
      background: colors.green.surface, border: `1px solid ${colors.border.soft}`, borderRadius: radius.lg,
      padding: wide ? 18 : 16, marginBottom: 16, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 id="reminder-title" style={{ margin: 0, fontSize: type.md, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-bell-heart" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Moment d’écoute
          </h2>
          <p id="reminder-desc" style={{ margin: '6px 0 0', fontSize: type.sm, color: colors.text.muted, lineHeight: 1.5 }}>
            Une notification douce en fin de journée, pour prendre le temps d’écouter ton corps et noter ton ressenti,
            que ça aille bien ou moins bien. Pas de rappel si tu l’as déjà noté.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={prefs.enabled} aria-labelledby="reminder-title" aria-describedby="reminder-desc"
          onClick={toggle} disabled={busy}
          style={{ border: 'none', background: 'transparent', padding: 0, minHeight: TOUCH_MIN, cursor: busy ? 'wait' : 'pointer', flexShrink: 0 }}>
          <Toggle on={prefs.enabled} decorative />
        </button>
      </div>

      {prefs.enabled && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <label htmlFor="reminder-time" style={{ fontSize: type.base, color: colors.text.body, fontWeight: 600 }}>Chaque jour à</label>
          <input id="reminder-time" type="time" value={prefs.time} step="300"
            onChange={(e) => changeTime(e.target.value)}
            style={{
              minHeight: TOUCH_MIN, padding: '0 10px', fontSize: 15, fontFamily: 'inherit', fontWeight: 600,
              border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm, background: colors.green.surface, color: colors.text.body,
            }} />
          <button type="button" onClick={tryIt} disabled={busy}
            style={{
              minHeight: TOUCH_MIN, padding: '0 14px', marginLeft: 'auto', borderRadius: radius.small,
              border: `1.5px solid ${colors.border.soft}`, background: 'transparent', color: colors.green.primaryDark,
              fontSize: type.base, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <i className="ti ti-send" aria-hidden="true" /> Essayer
          </button>
        </div>
      )}

      {(error || blocked || localOnly || (!prefs.enabled && support.iosNeedsInstall)) && (
        <div role={error ? 'alert' : 'status'} style={{
          display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: type.sm, lineHeight: 1.5, padding: '9px 12px', borderRadius: radius.sm,
          background: error || blocked ? colors.amber.bg : colors.green.soft, color: error || blocked ? colors.amber.text : colors.text.body,
        }}>
          <i className={`ti ${error || blocked ? 'ti-alert-circle' : 'ti-info-circle'}`} style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span>
            {error
              || (blocked && 'Les notifications sont bloquées pour Pousse dans ton navigateur : autorise-les dans ses réglages pour recevoir le rappel.')
              || (localOnly && (isRemoteMode()
                ? 'Sur cet appareil, le rappel n\u2019apparaît que si Pousse est ouvert à l\u2019heure choisie.'
                : 'Sans sauvegarde en ligne, le rappel n\u2019apparaît que si Pousse est ouvert à l\u2019heure choisie.'))
              || 'Sur iPhone et iPad, ajoute d\u2019abord Pousse à ton écran d\u2019accueil pour recevoir le rappel.'}
          </span>
        </div>
      )}
    </section>
  )
}
