// =============================================================
// Consentement explicite aux données de santé (RGPD art. 9) et âge minimum.
//
// Utilisé à l'inscription (Auth.jsx) et pour les comptes en ligne créés avant
// la version 11 (ConsentGate dans App.jsx). Les cases ne sont jamais précochées.
// Si le texte change, augmenter CONSENT_VERSION dans server/src/app.js : les
// comptes ayant accepté l'ancien texte devront accepter le nouveau.
//
// À faire quand les pages légales existeront : ajouter ici le lien vers la
// politique de confidentialité (audit, P0 « pages légales »).
// =============================================================
import { colors, radius } from '../theme/tokens'

// Âge minimum : en France, un mineur de moins de 15 ans ne peut pas consentir
// seul au traitement de ses données (loi Informatique et Libertés, art. 45).
// À confirmer par l'analyse juridique (l'audit évoque aussi un public adulte).
export const MIN_AGE = 15

export const MEDICAL_DISCLAIMER = 'Pousse est un carnet de suivi : il ne pose pas de diagnostic et ne remplace pas l\u2019avis d\u2019un professionnel de santé. En cas d\u2019urgence, appelle le 15 ou le 112.'

function Check({ id, checked, onChange, children, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, lineHeight: 1.45, color: colors.text.body }}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          style={{ width: 20, height: 20, margin: '1px 0 0', flexShrink: 0, accentColor: colors.green.primary, cursor: 'pointer' }} />
        <span>{children}</span>
      </label>
      {hint && <div id={`${id}-hint`} style={{ fontSize: 12, lineHeight: 1.45, color: colors.text.muted, margin: '0 0 0 30px' }}>{hint}</div>}
    </div>
  )
}

export default function HealthConsent({ remote, health, age, onHealth, onAge, idPrefix = 'consent' }) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
      <legend style={{ fontSize: 13, fontWeight: 700, color: colors.text.title, marginBottom: 8, padding: 0 }}>
        Tes données de santé
      </legend>
      <Check id={`${idPrefix}-health`} checked={health} onChange={onHealth}
        hint={remote
          ? 'Elles sont sauvegardées sur le serveur de Pousse, ne sont ni vendues ni partagées, et tu peux les exporter ou les supprimer à tout moment depuis ton profil. Supprimer ton compte retire cet accord.'
          : 'Elles restent sur cet appareil, ne sont ni vendues ni partagées, et tu peux les exporter ou les supprimer à tout moment depuis ton profil.'}>
        J’accepte que Pousse traite mes données de santé (épisodes, traitements, cycle, ressentis, poids…) pour tenir mon journal et préparer mon rapport médecin.
      </Check>
      <Check id={`${idPrefix}-age`} checked={age} onChange={onAge}
        hint={`En dessous de ${MIN_AGE} ans, l’accord d’un parent est nécessaire : Pousse n’est pas encore prévu pour cela.`}>
        J’ai au moins {MIN_AGE} ans.
      </Check>
      <p style={{
        display: 'flex', gap: 8, alignItems: 'flex-start', margin: '4px 0 0', padding: '9px 12px',
        background: colors.green.soft, borderRadius: radius.sm, fontSize: 12, lineHeight: 1.5, color: colors.text.body,
      }}>
        <i className="ti ti-stethoscope" aria-hidden="true" style={{ fontSize: 15, color: colors.green.primaryDark, marginTop: 1 }} />
        <span>{MEDICAL_DISCLAIMER}</span>
      </p>
    </fieldset>
  )
}
