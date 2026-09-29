import { useState } from 'react'
import { colors, radius, type, TOUCH_MIN } from '../theme/tokens'
import {
  conditions, CUSTOM_ICONS, CUSTOM_LABEL_MAX, activeCustomConditions,
  addCustomConditionPatch, removeCustomConditionPatch,
} from '../data/conditions'

// =============================================================
// Pathologies personnelles : création (saisie d'un épisode, profil)
// et gestion (profil). Voir data/conditions.js pour le registre.
// =============================================================

const inputStyle = {
  width: '100%', minHeight: TOUCH_MIN + 4, padding: '0 14px', fontSize: type.base, fontFamily: 'inherit', boxSizing: 'border-box',
  border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
}
const linkBtn = {
  minHeight: TOUCH_MIN, padding: '0 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
  color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
}

export function CustomConditionForm({ profile, updateProfile, toast, onCreated, onCancel, idPrefix = 'cc' }) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState(CUSTOM_ICONS[0])
  function submit(e) {
    e.preventDefault()
    const r = addCustomConditionPatch(profile, label, icon)
    if (r.error) { toast(r.error, 'error'); return }
    updateProfile(r.patch)
    toast(`« ${label.trim()} » ajoutée à tes pathologies`, 'success')
    setLabel('')
    onCreated?.(r.id)
  }
  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 10, background: colors.green.soft, borderRadius: radius.small, padding: 12 }}>
      <label htmlFor={`${idPrefix}-label`} style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.muted }}>Nom de la pathologie</label>
      <input id={`${idPrefix}-label`} autoFocus value={label} maxLength={CUSTOM_LABEL_MAX} onChange={(e) => setLabel(e.target.value)}
        placeholder="Ex. Névralgie d’Arnold, Cystite…" style={inputStyle} />
      <div role="group" aria-label="Icône" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CUSTOM_ICONS.map((ic) => (
          <button key={ic} type="button" aria-pressed={icon === ic} aria-label={`Icône ${CUSTOM_ICONS.indexOf(ic) + 1}`} onClick={() => setIcon(ic)}
            style={{
              width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: radius.small, cursor: 'pointer',
              border: `2px solid ${icon === ic ? colors.green.primary : colors.border.soft}`,
              background: icon === ic ? colors.green.softer : colors.green.surface, color: colors.text.title, fontSize: 20,
            }}>
            <i className={`ti ${ic}`} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" disabled={!label.trim()} aria-label="Créer cette pathologie"
          style={{ ...linkBtn, background: label.trim() ? colors.green.primary : colors.border.soft, color: label.trim() ? colors.onPrimary : colors.text.muted, borderRadius: radius.small, padding: '0 16px' }}>
          <i className="ti ti-plus" aria-hidden="true" /> Créer
        </button>
        {onCancel && <button type="button" onClick={onCancel} style={linkBtn}>Annuler</button>}
      </div>
    </form>
  )
}

// Suppression avec annulation ; les épisodes passés gardent le nom (archivage)
export function removeCustomCondition({ id, profile, updateProfile, toast, episodes }) {
  const before = { customConditions: profile.customConditions || [], quickFavorites: profile.quickFavorites || [] }
  const label = conditions[id]?.label || 'Pathologie'
  const used = episodes.some((e) => e.condition === id)
  updateProfile(removeCustomConditionPatch(profile, id, episodes))
  toast(used ? `« ${label} » retirée de ta liste. Ses épisodes passés gardent ce nom.` : `« ${label} » supprimée`, 'info', {
    duration: 5000, actionLabel: 'Annuler', action: () => updateProfile(before),
  })
}

export function CustomConditionsSection({ profile, updateProfile, toast, episodes, wide }) {
  const list = activeCustomConditions(profile)
  const [adding, setAdding] = useState(false)
  return (
    <section aria-labelledby="custom-cond-title" style={{
      background: colors.green.soft, borderRadius: radius.lg, padding: wide ? '18px 20px 20px' : '15px 15px 16px',
      marginBottom: wide ? 18 : 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <h2 id="custom-cond-title" style={{ margin: 0, fontSize: type.md, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-list-details" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Mes pathologies
      </h2>
      <div style={{ fontSize: type.sm, color: colors.text.muted, lineHeight: 1.5, marginTop: -4 }}>
        Ajoute une pathologie qui n’est pas dans la liste : elle apparaîtra quand tu notes un épisode.
      </div>
      {list.length > 0 && (
        <ul aria-label="Pathologies personnelles" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((c) => (
            <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.green.surface, border: `1px solid ${colors.border.soft}`, borderRadius: radius.small, padding: '4px 4px 4px 12px' }}>
              <i className={`ti ${c.icon}`} style={{ fontSize: 20, color: c.accent }} aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: colors.text.title }}>{c.label}</span>
              <button type="button" onClick={() => removeCustomCondition({ id: c.id, profile, updateProfile, toast, episodes })}
                aria-label={`Supprimer ${c.label}`}
                style={{ width: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.danger.text, cursor: 'pointer', fontSize: 18, borderRadius: radius.small }}>
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <CustomConditionForm profile={profile} updateProfile={updateProfile} toast={toast} idPrefix="profile-cc"
          onCreated={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ ...linkBtn, alignSelf: 'flex-start', padding: 0 }}>
          <i className="ti ti-plus" aria-hidden="true" /> Ajouter une pathologie
        </button>
      )}
    </section>
  )
}
