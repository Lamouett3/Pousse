import { useEffect, useState } from 'react'
import { colors, radius, shadow, type, TOUCH_MIN } from '../theme/tokens'
import { getSyncStatus, onSyncStatus, syncNow, importLocalAccount } from '../data/sync'
import { api } from '../data/remote'
import { localAccountsWithData, verifyLocalAccount, currentAccountId } from '../data/auth'

// =============================================================
// Profil → « Sauvegarde en ligne » (mode en ligne uniquement)
// État de la synchronisation, transfert d'un compte local de l'appareil,
// téléchargement de toutes ses données et suppression du compte (RGPD).
// =============================================================

function ago(iso) {
  if (!iso) return null
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`
  return `à ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

const btn = (variant = 'soft') => ({
  minHeight: TOUCH_MIN, padding: '0 14px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
  fontSize: type.sm, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  border: variant === 'danger' ? `1px solid ${colors.danger.border}` : `1.5px solid ${colors.border.soft}`,
  background: variant === 'danger' ? colors.danger.bg : colors.green.surface,
  color: variant === 'danger' ? colors.danger.text : colors.green.primaryDark,
})
const input = {
  width: '100%', minHeight: TOUCH_MIN, padding: '0 12px', fontSize: type.base, fontFamily: 'inherit', boxSizing: 'border-box',
  border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
}

export default function CloudBackup({ toast, onAccountDeleted, wide }) {
  const [status, setStatus] = useState(getSyncStatus)
  const [, tick] = useState(0)
  const [importing, setImporting] = useState(null) // id du compte local en cours de transfert
  const [importPw, setImportPw] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [busy, setBusy] = useState(false)
  const locals = localAccountsWithData().filter((a) => a.id !== currentAccountId())

  useEffect(() => onSyncStatus(setStatus), [])
  // Adresse e-mail de récupération (lue sur le serveur)
  const [account, setAccount] = useState(null)
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPw, setEmailPw] = useState('')
  useEffect(() => { api('GET', '/api/auth/me').then((r) => setAccount(r.user)).catch(() => {}) }, [])
  async function saveEmail(e) {
    e.preventDefault()
    try {
      const r = await api('POST', '/api/account/email', { email: newEmail.trim(), password: emailPw })
      setAccount(r.user); setEditingEmail(false); setNewEmail(''); setEmailPw('')
      toast('Adresse e-mail enregistrée', 'success')
    } catch (err) {
      toast(err.message || 'Enregistrement impossible', 'error')
    }
  }
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t) }, [])

  const st = status.state === 'syncing' ? { icon: 'ti-refresh', color: colors.text.muted, text: 'Synchronisation…' }
    : status.state === 'offline' ? { icon: 'ti-cloud-off', color: colors.amber.text, text: `Hors ligne${status.pending ? ` : ${status.pending} modification${status.pending > 1 ? 's' : ''} en attente, envoyée${status.pending > 1 ? 's' : ''} au retour du réseau` : ''}` }
      : status.state === 'error' ? { icon: 'ti-alert-triangle', color: colors.danger.text, text: `Échec de la synchronisation : ${status.error}` }
        : status.pending ? { icon: 'ti-cloud-upload', color: colors.amber.text, text: `${status.pending} modification${status.pending > 1 ? 's' : ''} en attente d'envoi` }
          : status.lastSyncAt ? { icon: 'ti-cloud-check', color: colors.green.primaryDark, text: `Tout est sauvegardé (${ago(status.lastSyncAt)})` }
            : { icon: 'ti-cloud', color: colors.text.muted, text: 'En attente de la première synchronisation' }

  async function handleImport(acc) {
    setBusy(true)
    const ok = await verifyLocalAccount(acc.id, importPw)
    if (!ok) { setBusy(false); toast('Mot de passe incorrect pour ce compte local', 'error'); return }
    const r = importLocalAccount(acc.id)
    setImporting(null); setImportPw(''); setBusy(false)
    toast(`${r.episodes} épisode${r.episodes > 1 ? 's' : ''} et ${r.feelings} ressenti${r.feelings > 1 ? 's' : ''} transférés vers ton compte en ligne`, 'success')
    syncNow()
  }

  async function handleExport() {
    try {
      const data = await api('GET', '/api/account/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `pousse-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch (e) {
      toast(e.message || 'Export impossible', 'error')
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await api('DELETE', '/api/account', { password: deletePw })
      // Efface aussi la copie locale de ce compte sur l'appareil
      const prefix = `pousse.${currentAccountId()}.`
      Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k))
      toast('Ton compte et toutes tes données ont été supprimés', 'success')
      onAccountDeleted()
    } catch (e) {
      toast(e.message || 'Suppression impossible', 'error')
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="cloud-title" style={{
      background: colors.green.soft, borderRadius: radius.lg, padding: wide ? 18 : 16, marginBottom: 16,
      boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h2 id="cloud-title" style={{ margin: 0, fontSize: type.md, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-cloud-lock" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Sauvegarde en ligne
      </h2>
      <p style={{ margin: 0, fontSize: type.sm, color: colors.text.muted, lineHeight: 1.5 }}>
        Tes données sont enregistrées sur cet appareil et sauvegardées sur ton compte. Tu les retrouves en te connectant depuis un autre appareil.
      </p>
      <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: type.sm, fontWeight: 600, color: st.color, lineHeight: 1.45 }}>
        <i className={`ti ${st.icon}`} style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" /> {st.text}
      </div>
      <div style={{ borderTop: `1px solid ${colors.border.soft}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.title }}>Adresse de récupération</div>
        {account && (account.email ? (
          <div style={{ fontSize: type.base, color: colors.text.body }}>{account.email}</div>
        ) : (
          <div role="status" style={{ fontSize: type.sm, color: colors.amber.text, background: colors.amber.bg, borderRadius: radius.small, padding: '8px 10px', lineHeight: 1.45 }}>
            Aucune adresse enregistrée : si tu oublies ton mot de passe, tu ne pourras pas récupérer ton compte. Ajoutes-en une.
          </div>
        ))}
        {!editingEmail ? (
          <button type="button" onClick={() => { setEditingEmail(true); setNewEmail(account?.email || '') }} style={{ ...btn(), alignSelf: 'flex-start' }}>
            <i className="ti ti-mail" aria-hidden="true" /> {account?.email ? 'Modifier l\u2019adresse' : 'Ajouter une adresse'}
          </button>
        ) : (
          <form onSubmit={saveEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="rec-email" style={{ fontSize: type.sm, color: colors.text.muted }}>Adresse e-mail</label>
            <input id="rec-email" type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={input} />
            <label htmlFor="rec-pw" style={{ fontSize: type.sm, color: colors.text.muted }}>Confirme avec ton mot de passe</label>
            <input id="rec-pw" type="password" autoComplete="current-password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} style={input} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={!newEmail.trim() || !emailPw} style={btn()}>Enregistrer l’adresse</button>
              <button type="button" onClick={() => setEditingEmail(false)} style={{ ...btn(), border: 'none', background: 'transparent' }}>Annuler</button>
            </div>
          </form>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => syncNow()} disabled={status.state === 'syncing'} style={btn()}>
          <i className="ti ti-refresh" aria-hidden="true" /> Synchroniser maintenant
        </button>
        <button onClick={handleExport} style={btn()}>
          <i className="ti ti-download" aria-hidden="true" /> Télécharger toutes mes données
        </button>
      </div>

      {locals.length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.border.soft}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.title }}>Données d'un compte local de cet appareil</div>
          <div style={{ fontSize: type.sm, color: colors.text.muted, lineHeight: 1.45 }}>
            Transfère-les vers ton compte en ligne pour ne plus risquer de les perdre. Les doublons sont ignorés.
          </div>
          {locals.map((a) => (
            <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: colors.green.surface, borderRadius: radius.small, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: type.base, color: colors.text.body }}><b>{a.name}</b>, {a.episodes} épisode{a.episodes > 1 ? 's' : ''}</span>
                {importing !== a.id && <button onClick={() => { setImporting(a.id); setImportPw('') }} style={btn()}>Transférer</button>}
              </div>
              {importing === a.id && (
                <form onSubmit={(e) => { e.preventDefault(); handleImport(a) }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label htmlFor={`imp-${a.id}`} style={{ fontSize: type.sm, color: colors.text.muted }}>Mot de passe du compte local « {a.name} »</label>
                  <input id={`imp-${a.id}`} type="password" autoComplete="off" value={importPw} onChange={(e) => setImportPw(e.target.value)} style={input} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={busy || !importPw} style={btn()}>Confirmer le transfert</button>
                    <button type="button" onClick={() => setImporting(null)} style={{ ...btn(), border: 'none', background: 'transparent' }}>Annuler</button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${colors.border.soft}`, paddingTop: 12 }}>
        {!deleting ? (
          <button onClick={() => setDeleting(true)} style={btn('danger')}>
            <i className="ti ti-trash" aria-hidden="true" /> Supprimer mon compte
          </button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleDelete() }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: type.sm, color: colors.danger.text, fontWeight: 700, lineHeight: 1.45 }}>
              Ton compte et toutes tes données seront supprimés définitivement, sur le serveur et sur cet appareil. Pense à télécharger tes données avant.
            </div>
            <label htmlFor="del-pw" style={{ fontSize: type.sm, color: colors.text.muted }}>Confirme avec ton mot de passe</label>
            <input id="del-pw" type="password" autoComplete="current-password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} style={input} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" disabled={busy || !deletePw} style={btn('danger')}>Supprimer définitivement</button>
              <button type="button" onClick={() => { setDeleting(false); setDeletePw('') }} style={{ ...btn(), border: 'none', background: 'transparent' }}>Annuler</button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
