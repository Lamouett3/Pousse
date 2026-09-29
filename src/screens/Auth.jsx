import { useState } from 'react'
import { colors, radius, font, shadow } from '../theme/tokens'
import { login, register, loadAccounts } from '../data/auth'
import { isRemoteMode, api } from '../data/remote'
import HealthConsent from '../components/HealthConsent'

export default function Auth({ bp = 'mobile', onAuthenticated, notice = '', resetToken = null, onResetDone }) {
  const remote = isRemoteMode()
  // 'login' | 'register' | 'forgot' (mot de passe oublié) | 'reset' (lien reçu par e-mail)
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [email, setEmail] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  // Consentement (inscription) : jamais précoché
  const [healthOk, setHealthOk] = useState(false)
  const [ageOk, setAgeOk] = useState(false)

  const accounts = loadAccounts()
  const hasAccounts = accounts.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // Création de compte : les deux saisies du mot de passe doivent être identiques
    if (mode === 'register' && password !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques')
      return
    }
    if (mode === 'register' && !healthOk) { setError('Coche la case d\u2019accord sur tes données de santé pour continuer'); return }
    if (mode === 'register' && !ageOk) { setError('Confirme que tu as l\u2019âge minimum pour utiliser Pousse'); return }
    const result = mode === 'login'
      ? await login(name, password)
      : await register(name, password, email, { healthConsent: healthOk, ageConfirmed: ageOk })
    if (result.ok) {
      onAuthenticated()
    } else {
      setError(result.error)
    }
  }

  // Mot de passe oublié : réponse identique que l'adresse existe ou non
  async function handleForgot(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api('POST', '/api/auth/forgot', { email: email.trim() })
      setInfo('Si un compte correspond à cette adresse, un e-mail vient de t\u2019être envoyé. Le lien est valable 30 minutes.')
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }
  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Choisis un mot de passe d\u2019au moins 8 caractères'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne sont pas identiques'); return }
    setBusy(true)
    try {
      await api('POST', '/api/auth/reset', { token: resetToken, password })
      setPassword(''); setConfirm(''); setMode('login')
      setInfo('Mot de passe modifié. Tu peux te connecter.')
      onResetDone?.()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const isTablet = bp === 'tablet'
  const isDesktop = bp === 'desktop'
  const cardWidth = isDesktop ? 380 : isTablet ? 360 : '100%'

  return (
    <div style={{
      minHeight: '100vh', background: 'transparent', fontFamily: font.family,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: cardWidth, maxWidth: 400,
        background: colors.green.surface, borderRadius: radius.card,
        padding: isDesktop ? '40px 36px' : '32px 24px',
        border: `0.5px solid ${colors.border.soft}`,
        boxShadow: shadow.lg,
      }}>
        {/* Logo anime — graine → bourgeon → fleur */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <svg width="64" height="64" viewBox="10 20 100 80" role="img" aria-label="Logo Pousse" style={{ marginBottom: 10, overflow: 'visible' }}>
            <defs>
              <filter id="auth-logo-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="3" floodColor="#2E4034" floodOpacity="0.2" />
              </filter>
            </defs>
            <g filter="url(#auth-logo-shadow)">
              <circle className="logo-seed" cx="60" cy="88" r="5" fill="#8B6F47" />
              <path className="logo-stem" d="M60 92 C60 78 59 66 56 56" stroke="#3F6B49" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path className="logo-leaf-l1" d="M56 60 C50 48 38 44 26 45 C28 60 40 66 54 63 C55 62 56 61 56 60 Z" fill="#7FB089" />
              <path className="logo-leaf-l2" d="M56 60 C50 50 40 47 30 47 C34 57 43 61 53 60 Z" fill="#9FC4A4" />
              <path className="logo-leaf-r1" d="M58 52 C60 38 72 30 86 30 C85 46 73 54 59 53 C58 53 58 52 58 52 Z" fill="#5A8262" />
              <path className="logo-leaf-r2" d="M58 52 C61 40 71 34 82 33 C80 44 71 50 59 50 Z" fill="#7FB089" />
              <circle className="logo-bloom" cx="60" cy="40" r="11" fill="#F3C8D2" />
              <circle className="logo-center" cx="60" cy="40" r="4.5" fill="#E9B85E" />
            </g>
          </svg>
          <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 28, fontWeight: 600, color: colors.text.title, letterSpacing: '-0.01em' }}>Pousse</div>
          <div style={{ fontSize: 13, color: colors.text.soft, marginTop: 4 }}>jour après jour</div>
        </div>

        {/* Toggle mode */}
        <div style={{ display: 'flex', background: colors.green.soft, borderRadius: radius.md, padding: 4, marginBottom: 20, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
          <button type="button" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); setConfirm('') }}
            style={{
              flex: 1, fontSize: 13, padding: '9px 0', border: 'none', borderRadius: radius.sm,
              background: mode === 'login' ? colors.green.surface : 'transparent',
              color: mode === 'login' ? colors.text.title : colors.text.soft,
              fontWeight: mode === 'login' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: mode === 'login' ? shadow.sm : 'none',
            }}>
            Se connecter
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); setConfirm('') }}
            style={{
              flex: 1, fontSize: 13, padding: '9px 0', border: 'none', borderRadius: radius.sm,
              background: mode === 'register' ? colors.green.surface : 'transparent',
              color: mode === 'register' ? colors.text.title : colors.text.soft,
              fontWeight: mode === 'register' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: mode === 'register' ? shadow.sm : 'none',
            }}>
            Créer un compte
          </button>
        </div>

        {notice && (
          <div role="status" style={{
            background: colors.amber.bg, color: colors.amber.text, fontSize: 13, lineHeight: 1.45,
            padding: '9px 13px', borderRadius: radius.sm, marginBottom: 14,
          }}>
            {notice}
          </div>
        )}

        {info && (
          <div role="status" style={{ background: colors.green.soft, color: colors.green.primaryDark, fontSize: 13, lineHeight: 1.45, padding: '9px 13px', borderRadius: radius.sm, marginBottom: 14 }}>
            {info}
          </div>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} noValidate>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, color: colors.text.title }}>Mot de passe oublié</h2>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: colors.text.muted, lineHeight: 1.45 }}>
              Indique l’adresse e-mail de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
            </p>
            <label htmlFor="forgot-email" style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Adresse e-mail</label>
            <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ton.adresse@exemple.fr"
              style={{ width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm, background: colors.green.surface, color: colors.text.body, marginBottom: 14, boxSizing: 'border-box' }} />
            {error && <div role="alert" style={{ color: colors.pink.text, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={busy || !email.trim()}
              style={{ width: '100%', border: 'none', background: colors.green.primary, color: colors.onPrimary, padding: 14, borderRadius: radius.lg, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !email.trim() ? 0.7 : 1 }}>
              Envoyer le lien
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(''); setInfo('') }}
              style={{ display: 'block', margin: '12px auto 0', minHeight: 44, border: 'none', background: 'transparent', color: colors.green.primaryDark, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Retour à la connexion
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} noValidate>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, color: colors.text.title }}>Choisis un nouveau mot de passe</h2>
            <label htmlFor="reset-pw" style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Nouveau mot de passe</label>
            <input id="reset-pw" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="new-password" placeholder="8 caractères minimum"
              style={{ width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm, background: colors.green.surface, color: colors.text.body, marginBottom: 14, boxSizing: 'border-box' }} />
            <label htmlFor="reset-confirm" style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Confirme le mot de passe</label>
            <input id="reset-confirm" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError('') }} autoComplete="new-password"
              style={{ width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm, background: colors.green.surface, color: colors.text.body, marginBottom: 14, boxSizing: 'border-box' }} />
            {error && <div role="alert" style={{ color: colors.pink.text, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={busy}
              style={{ width: '100%', border: 'none', background: colors.green.primary, color: colors.onPrimary, padding: 14, borderRadius: radius.lg, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Enregistrer le nouveau mot de passe
            </button>
          </form>
        )}

        {(mode === 'login' || mode === 'register') && (
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>{remote && mode === 'login' ? 'Nom ou adresse e-mail' : 'Nom'}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={mode === 'login' ? (remote ? 'Ton nom de compte ou ton e-mail' : 'Ton nom de compte') : 'Choisis un nom'}
            autoComplete="username"
            style={{
              width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit',
              border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm,
              background: colors.green.surface, color: colors.text.body,
              marginBottom: 14, boxSizing: 'border-box',
            }} />

          {remote && mode === 'register' && (
            <>
              <label htmlFor="auth-email" style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Adresse e-mail</label>
              <input id="auth-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError('') }} autoComplete="email"
                placeholder="Pour récupérer ton compte si besoin"
                style={{ width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm, background: colors.green.surface, color: colors.text.body, marginBottom: 14, boxSizing: 'border-box' }} />
            </>
          )}

          <label style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
            placeholder="Mot de passe"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={{
              width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit',
              border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.sm,
              background: colors.green.surface, color: colors.text.body,
              marginBottom: mode === 'register' ? 14 : 18, boxSizing: 'border-box',
            }} />

          {mode === 'register' && (() => {
            const mismatch = confirm.length > 0 && confirm !== password
            const match = confirm.length > 0 && confirm === password
            return (
              <>
                <label htmlFor="auth-confirm" style={{ display: 'block', fontSize: 13, color: colors.text.muted, marginBottom: 6 }}>
                  Confirme le mot de passe
                </label>
                <input id="auth-confirm" type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); if (error) setError('') }}
                  placeholder="Saisis-le une seconde fois"
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  aria-describedby="auth-confirm-hint"
                  style={{
                    width: '100%', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit',
                    border: `1.5px solid ${mismatch ? colors.pink.border : match ? colors.green.leaf : colors.border.soft}`,
                    borderRadius: radius.sm,
                    background: colors.green.surface, color: colors.text.body,
                    marginBottom: 6, boxSizing: 'border-box',
                  }} />
                <div id="auth-confirm-hint" aria-live="polite" style={{
                  minHeight: 18, fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5,
                  color: mismatch ? colors.pink.text : colors.green.primaryDark,
                }}>
                  {mismatch && (<><i className="ti ti-alert-circle" aria-hidden="true" /> Les mots de passe ne correspondent pas</>)}
                  {match && (<><i className="ti ti-check" aria-hidden="true" /> Les mots de passe sont identiques</>)}
                </div>
              </>
            )
          })()}

          {mode === 'register' && (
            <HealthConsent remote={remote} health={healthOk} age={ageOk}
              onHealth={(v) => { setHealthOk(v); if (error) setError('') }}
              onAge={(v) => { setAgeOk(v); if (error) setError('') }} />
          )}

          {error && (
            <div role="alert" style={{
              background: colors.pink.soft, color: colors.pink.text, fontSize: 13,
              padding: '9px 13px', borderRadius: radius.sm, marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 15 }} aria-hidden="true" />
              {error}
            </div>
          )}

          <button type="submit"
            style={{
              width: '100%', border: 'none', background: colors.green.primary,
              color: colors.onPrimary, padding: 14, borderRadius: radius.lg, fontSize: 14,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: shadow.button,
            }}>
            <i className={`ti ${mode === 'login' ? 'ti-login' : 'ti-user-plus'}`} aria-hidden="true" />
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
        )}

        {remote && mode === 'login' && (
          <button type="button" onClick={() => { setMode('forgot'); setError(''); setInfo(''); setEmail(name.includes('@') ? name : '') }}
            style={{ display: 'block', margin: '12px auto 0', minHeight: 44, border: 'none', background: 'transparent', color: colors.green.primaryDark, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Mot de passe oublié ?
          </button>
        )}

        {hasAccounts && mode === 'login' && (
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: colors.text.faint }}>
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} sur cet appareil
          </div>
        )}
      </div>
    </div>
  )
}
