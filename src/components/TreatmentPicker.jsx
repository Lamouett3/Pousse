import { useState } from 'react'
import { colors, radius, type, TOUCH_MIN } from '../theme/tokens'
import { myTreatments, addMyTreatment, knownTreatmentNames, TREATMENT_NAME_MAX } from '../data/lifestyle'

// =============================================================
// Choix du traitement (saisie d'un épisode, « Noter vite »)
// Ordre : « Aucun », mes traitements (profile.myTreatments), puis les
// suggestions liées à la pathologie. « + Ajouter un médicament » en crée un
// nouveau, qui reste ensuite disponible en bouton. « Gérer » affiche la
// suppression (masquée par défaut pour éviter les erreurs en pleine crise).
// =============================================================

const norm = (s) => String(s).trim().toLowerCase()

export default function TreatmentPicker({ value, onChange, suggestions = [], profile, updateProfile, toast, dark = false }) {
  const mine = myTreatments(profile)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [managing, setManaging] = useState(false)

  const mineNames = new Set(mine.map((t) => norm(t.name)))
  const others = suggestions.filter((s) => !mineNames.has(norm(s)))
  // Valeur d'un ancien épisode qui ne figure dans aucune liste : on l'affiche quand même
  const orphan = value && value !== 'Aucun' && !mineNames.has(norm(value)) && !others.some((s) => norm(s) === norm(value)) ? value : null

  const chip = (active) => ({
    minHeight: TOUCH_MIN + 4, padding: '0 16px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
    border: `2px solid ${active ? colors.green.primary : colors.border.soft}`,
    background: active ? colors.green.softer : colors.green.surface,
    color: active ? colors.text.title : colors.text.body,
    fontSize: type.base, fontWeight: active ? 700 : 500,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  })
  const link = {
    minHeight: TOUCH_MIN, padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
    color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
  }

  function add(e) {
    e.preventDefault()
    const r = addMyTreatment(profile, name)
    if (r.error) { toast(r.error, 'error'); return }
    if (!r.duplicate) {
      updateProfile({ myTreatments: r.list })
      toast(`« ${r.item.name} » ajouté à tes traitements`, 'success')
    }
    onChange(r.item.name, r.item)
    setName(''); setAdding(false)
  }

  function remove(t) {
    const before = mine
    updateProfile({ myTreatments: mine.filter((x) => x.id !== t.id) })
    if (norm(value) === norm(t.name)) onChange('Aucun')
    toast(`« ${t.name} » retiré de tes traitements`, 'info', {
      duration: 5000, actionLabel: 'Annuler', action: () => updateProfile({ myTreatments: before }),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="group" aria-label="Traitement pris" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" aria-pressed={value === 'Aucun'} onClick={() => onChange('Aucun')} style={chip(value === 'Aucun')}>Aucun</button>
        {mine.map((t) => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'stretch' }}>
            <button type="button" aria-pressed={norm(value) === norm(t.name)} onClick={() => onChange(t.name, t)}
              style={{
                ...chip(norm(value) === norm(t.name)),
                ...(managing ? {
                  borderTopLeftRadius: radius.small, borderTopRightRadius: 0,
                  borderBottomLeftRadius: radius.small, borderBottomRightRadius: 0,
                  borderRadius: undefined,
                } : {}),
              }}>
              <i className="ti ti-pill" aria-hidden="true" style={{ fontSize: 16, color: colors.green.primaryDark }} />
              {t.name}
            </button>
            {managing && (
              <button type="button" onClick={() => remove(t)} aria-label={`Supprimer ${t.name} de mes traitements`}
                style={{
                  minWidth: TOUCH_MIN, border: `2px solid ${colors.danger.border}`, borderLeft: 'none',
                  borderRadius: `0 ${radius.small} ${radius.small} 0`, background: colors.danger.bg, color: colors.danger.text,
                  cursor: 'pointer', fontSize: 18,
                }}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        {others.map((s) => (
          <button key={s} type="button" aria-pressed={norm(value) === norm(s)} onClick={() => onChange(s)} style={chip(norm(value) === norm(s))}>{s}</button>
        ))}
        {orphan && (
          <button type="button" aria-pressed="true" onClick={() => onChange(orphan)} style={chip(true)}>{orphan}</button>
        )}
        {!adding && (
          <button type="button" onClick={() => { setAdding(true); setManaging(false) }}
            style={{ ...chip(false), borderStyle: 'dashed', color: colors.green.primaryDark, fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> Ajouter un médicament
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label htmlFor="new-treatment" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Nom du médicament</label>
          <input id="new-treatment" autoFocus value={name} maxLength={TREATMENT_NAME_MAX} onChange={(e) => setName(e.target.value)}
            list="treatment-suggestions" placeholder="Nom du médicament, ex. Propranolol"
            style={{
              flex: '1 1 200px', minHeight: TOUCH_MIN + 4, padding: '0 14px', fontSize: type.base, fontFamily: 'inherit', boxSizing: 'border-box',
              border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
            }} />
          <datalist id="treatment-suggestions">
            {knownTreatmentNames().map((n) => <option key={n} value={n} />)}
          </datalist>
          <button type="submit" disabled={!name.trim()}
            style={{ ...chip(true), background: colors.green.primary, color: colors.onPrimary, border: 'none', opacity: name.trim() ? 1 : 0.6 }}>
            Ajouter
          </button>
          <button type="button" onClick={() => { setAdding(false); setName('') }} style={link}>Annuler</button>
        </form>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
        {mine.length > 0 && !adding && (
          <button type="button" onClick={() => setManaging(!managing)} aria-pressed={managing} style={link}>
            <i className={`ti ${managing ? 'ti-check' : 'ti-settings'}`} aria-hidden="true" /> {managing ? 'Terminé' : 'Gérer mes traitements'}
          </button>
        )}
        {mine.length === 0 && !adding && (
          <span style={{ fontSize: type.xs, color: colors.text.soft }}>
            Les médicaments que tu ajoutes restent ensuite disponibles ici et dans ton profil.
          </span>
        )}
      </div>
    </div>
  )
}
