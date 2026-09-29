// =============================================================
// Accord sur les données de santé pour un compte en ligne existant
// (créé avant la version 11, ou texte de consentement mis à jour).
// Tant qu'il n'est pas donné, le serveur refuse la synchronisation : les
// données restent sur l'appareil, rien n'est perdu.
// =============================================================
import { useState } from 'react'
import { colors, radius, font, shadow } from '../theme/tokens'
import { api, ApiError } from '../data/remote'
import { setConsentRequired } from '../data/auth'
import HealthConsent from '../components/HealthConsent'

export default function Consent({ bp = 'mobile', name, onAccepted, onLogout }) {
  const [health, setHealth] = useState(false)
  const [age, setAge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function accept(e) {
    e.preventDefault()
    setError('')
    if (!health) { setError('Coche la case d\u2019accord sur tes données de santé pour continuer'); return }
    if (!age) { setError('Confirme que tu as l\u2019âge minimum pour utiliser Pousse'); return }
    setBusy(true)
    try {
      await api('POST', '/api/account/consent', { healthConsent: true, ageConfirmed: true })
      setConsentRequired(false)
      onAccepted()
    } catch (err) {
      // Session expirée : retour à la connexion (l'accord sera redemandé ensuite)
      if (err instanceof ApiError && err.status === 401) { onLogout(); return }
      else setError(err.message)
      setBusy(false)
    }
  }

  const isDesktop = bp === 'desktop'
  return (
    <main style={{ minHeight: '100vh', fontFamily: font.family, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={accept} noValidate style={{
        width: isDesktop ? 420 : '100%', maxWidth: 440, background: colors.green.surface, borderRadius: radius.card,
        padding: isDesktop ? '36px 36px 28px' : '28px 22px 22px', border: `0.5px solid ${colors.border.soft}`, boxShadow: shadow.lg,
      }}>
        <h1 style={{ fontFamily: font.display, fontSize: 21, fontWeight: 600, color: colors.text.title, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} un accord est nécessaire
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: colors.text.muted, margin: '0 0 18px' }}>
          Pour continuer à sauvegarder ton journal en ligne, Pousse a besoin de ton accord explicite.
          Tes données restent sur cet appareil en attendant : rien n’est perdu.
        </p>

        <HealthConsent remote idPrefix="gate" health={health} age={age}
          onHealth={(v) => { setHealth(v); setError('') }} onAge={(v) => { setAge(v); setError('') }} />

        {error && <div role="alert" style={{ background: colors.pink.soft, color: colors.pink.text, fontSize: 13, padding: '9px 13px', borderRadius: radius.sm, marginBottom: 14 }}>{error}</div>}

        <button type="submit" disabled={busy} style={{
          width: '100%', border: 'none', background: colors.green.primary, color: colors.onPrimary, padding: 14,
          borderRadius: radius.lg, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: shadow.button, opacity: busy ? 0.7 : 1,
        }}>
          J’accepte et je continue
        </button>
        <button type="button" onClick={onLogout} style={{
          display: 'block', margin: '10px auto 0', minHeight: 44, border: 'none', background: 'transparent',
          color: colors.text.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Me déconnecter
        </button>
      </form>
    </main>
  )
}
