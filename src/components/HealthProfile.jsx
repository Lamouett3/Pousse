import { useEffect, useState } from 'react'
import { colors, radius, shadow, type, TOUCH_MIN } from '../theme/tokens'
import {
  HEIGHT_RANGE, WEIGHT_RANGE, LIFESTYLE_ITEMS, isInReport,
  sortedWeights, latestWeight, withWeight, parseDecimal, formatKg,
  myTreatments, addMyTreatment, knownTreatmentNames, TREATMENT_FREQUENCIES, TREATMENT_NAME_MAX,
} from '../data/lifestyle'

// =============================================================
// Profil → « Mesures » (taille, historique du poids) et « Mode de vie »
// Tout est facultatif. Pas d'IMC ni d'objectif affichés ici : le suivi du
// poids peut être un sujet sensible ; le rapport médecin donne les chiffres.
// =============================================================

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shortDate = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const card = (wide) => ({
  background: colors.green.soft, borderRadius: radius.lg, padding: wide ? '18px 20px 20px' : '15px 15px 16px',
  marginBottom: wide ? 18 : 14, boxShadow: shadow.card, display: 'flex', flexDirection: 'column', gap: 14,
})
const title = { margin: 0, fontSize: type.md, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 8 }
const fieldLabel = { display: 'block', fontSize: 13, fontWeight: 700, color: colors.text.muted, marginBottom: 6 }
const input = {
  minHeight: TOUCH_MIN, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
  border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
}
const smallBtn = {
  minHeight: TOUCH_MIN, padding: '0 14px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
  fontSize: type.sm, fontWeight: 700, border: `1.5px solid ${colors.green.primary}`,
  background: colors.green.surface, color: colors.green.primaryDark,
}

// Courbe discrète de l'évolution du poids (sans axe ni zone « idéale »)
function WeightSparkline({ entries }) {
  if (entries.length < 2) return null
  const W = 260, H = 48, P = 6
  const kgs = entries.map((e) => e.kg)
  const min = Math.min(...kgs), max = Math.max(...kgs)
  const span = max - min || 1
  const pts = entries.map((e, i) => {
    const x = P + (i * (W - 2 * P)) / (entries.length - 1)
    const y = H - P - ((e.kg - min) / span) * (H - 2 * P)
    return [x, y]
  })
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const first = entries[0], last = entries[entries.length - 1]
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label={`Évolution du poids : ${formatKg(first.kg)} le ${shortDate(first.date)}, ${formatKg(last.kg)} le ${shortDate(last.date)}`}>
        <path d={d} style={{ stroke: colors.green.primary }} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" style={{ fill: colors.green.primary }} />)}
      </svg>
    </figure>
  )
}

export function BodySection({ profile, updateProfile, toast, wide }) {
  const savedH = profile.heightCm ? String(profile.heightCm) : ''
  const [height, setHeight] = useState(savedH)
  useEffect(() => { setHeight(savedH) }, [savedH])
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(todayKey())
  const [showAll, setShowAll] = useState(false)
  const entries = sortedWeights(profile)
  const last = latestWeight(profile)

  function commitHeight() {
    const v = height.trim()
    if (v === savedH) return
    if (v === '') { updateProfile({ heightCm: null }); return }
    const n = Number(v)
    if (!Number.isInteger(n) || n < HEIGHT_RANGE[0] || n > HEIGHT_RANGE[1]) {
      toast(`Indique une taille entre ${HEIGHT_RANGE[0]} et ${HEIGHT_RANGE[1]} cm`, 'error')
      setHeight(savedH)
      return
    }
    updateProfile({ heightCm: n })
    toast('Taille enregistrée', 'success')
  }

  function addWeight(e) {
    e.preventDefault()
    const n = parseDecimal(kg)
    if (!Number.isFinite(n) || n < WEIGHT_RANGE[0] || n > WEIGHT_RANGE[1]) {
      toast(`Indique un poids entre ${WEIGHT_RANGE[0]} et ${WEIGHT_RANGE[1]} kg`, 'error')
      return
    }
    if (!date || date > todayKey()) { toast('Choisis une date passée ou aujourd\u2019hui', 'error'); return }
    const replaced = entries.some((w) => w.date === date)
    updateProfile({ weightHistory: withWeight(profile, date, n) })
    setKg('')
    toast(replaced ? 'Mesure du jour remplacée' : 'Poids enregistré', 'success')
  }

  function removeWeight(d) {
    updateProfile({ weightHistory: entries.filter((w) => w.date !== d) })
    toast('Mesure supprimée', 'success')
  }

  const listed = showAll ? [...entries].reverse() : [...entries].reverse().slice(0, 4)

  return (
    <section aria-labelledby="body-title" style={card(wide)}>
      <h2 id="body-title" style={title}>
        <i className="ti ti-ruler-measure" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Mesures
      </h2>
      <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: -8 }}>Facultatif. Indiquées dans ton rapport médecin.</div>

      <div>
        <label htmlFor="height-cm" style={fieldLabel}>Taille</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input id="height-cm" type="text" inputMode="numeric" maxLength={3} placeholder="Ex. 168"
            value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commitHeight} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={{ ...input, width: 100 }} />
          <span style={{ fontSize: 15, color: colors.text.muted }}>cm</span>
        </div>
      </div>

      <div>
        <div style={fieldLabel}>Poids</div>
        {last ? (
          <div style={{ fontSize: 15, color: colors.text.body, marginBottom: 8 }}>
            Dernière mesure : <b style={{ color: colors.text.title }}>{formatKg(last.kg)}</b> le {shortDate(last.date)}
          </div>
        ) : (
          <div style={{ fontSize: type.sm, color: colors.text.muted, marginBottom: 8 }}>Aucune mesure pour l'instant.</div>
        )}
        <WeightSparkline entries={entries} />
        <form onSubmit={addWeight} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
          <div>
            <label htmlFor="weight-kg" style={{ ...fieldLabel, fontWeight: 600 }}>Nouveau poids (kg)</label>
            <input id="weight-kg" type="text" inputMode="decimal" maxLength={5} placeholder="Ex. 64,5"
              value={kg} onChange={(e) => setKg(e.target.value.replace(/[^0-9.,]/g, ''))} style={{ ...input, width: 110 }} />
          </div>
          <div>
            <label htmlFor="weight-date" style={{ ...fieldLabel, fontWeight: 600 }}>Date</label>
            <input id="weight-date" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} style={{ ...input, width: 160 }} />
          </div>
          <button type="submit" disabled={!kg} aria-label="Ajouter ce poids" style={{ ...smallBtn, opacity: kg ? 1 : 0.6 }}>
            <i className="ti ti-plus" aria-hidden="true" /> Ajouter
          </button>
        </form>
        {entries.length > 0 && (
          <ul aria-label="Historique du poids" style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {listed.map((w) => (
              <li key={w.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: colors.green.surface, borderRadius: radius.small, padding: '2px 4px 2px 12px' }}>
                <span style={{ fontSize: 15, color: colors.text.body }}>{shortDate(w.date)} : <b>{formatKg(w.kg)}</b></span>
                <button onClick={() => removeWeight(w.date)} aria-label={`Supprimer la mesure du ${shortDate(w.date)}`}
                  style={{ width: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.text.soft, cursor: 'pointer', borderRadius: radius.small }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {entries.length > 4 && (
          <button onClick={() => setShowAll(!showAll)} style={{ ...smallBtn, border: 'none', background: 'transparent', padding: 0, marginTop: 4 }}>
            {showAll ? 'Afficher moins' : `Voir les ${entries.length} mesures`}
          </button>
        )}
      </div>
    </section>
  )
}

// Rubrique « Traitements » : mes médicaments habituels (profile.myTreatments),
// partagés avec la saisie et « Noter vite » (voir TreatmentPicker).
function MyTreatmentsBlock({ profile, updateProfile, toast }) {
  const list = myTreatments(profile)
  const [name, setName] = useState('')
  const setItem = (id, patch) => updateProfile({ myTreatments: list.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
  function add(e) {
    e.preventDefault()
    const r = addMyTreatment(profile, name)
    if (r.error) { toast(r.error, 'error'); return }
    if (r.duplicate) { toast(`« ${r.item.name} » est déjà dans ta liste`, 'info'); return }
    updateProfile({ myTreatments: r.list })
    setName('')
    toast(`« ${r.item.name} » ajouté`, 'success')
  }
  function remove(t) {
    updateProfile({ myTreatments: list.filter((x) => x.id !== t.id) })
    toast(`« ${t.name} » supprimé`, 'info', { duration: 5000, actionLabel: 'Annuler', action: () => updateProfile({ myTreatments: list }) })
  }
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <legend style={{ padding: 0, marginBottom: 8, fontSize: 15, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-pill" style={{ fontSize: 18, color: colors.text.muted }} aria-hidden="true" /> Traitements
      </legend>
      <div style={{ fontSize: 12, color: colors.text.soft, marginTop: -4 }}>
        Tes médicaments habituels. Ils apparaissent aussi en boutons quand tu notes un épisode.
      </div>
      {list.length > 0 && (
        <ul aria-label="Mes traitements" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((t) => (
            <li key={t.id} style={{ background: colors.green.surface, border: `1px solid ${colors.border.soft}`, borderRadius: radius.small, padding: '10px 10px 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: colors.text.title }}>{t.name}</span>
                <button type="button" onClick={() => remove(t)} aria-label={`Supprimer ${t.name}`}
                  style={{ width: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.danger.text, cursor: 'pointer', borderRadius: radius.small, fontSize: 18 }}>
                  <i className="ti ti-trash" aria-hidden="true" />
                </button>
              </div>
              <div role="group" aria-label={`Fréquence de ${t.name}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TREATMENT_FREQUENCIES.map((f) => {
                  const on = t.frequency === f.v
                  return (
                    <button key={f.v} type="button" aria-pressed={on} onClick={() => setItem(t.id, { frequency: on ? null : f.v })}
                      style={{
                        minHeight: TOUCH_MIN - 4, padding: '0 12px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                        fontWeight: on ? 700 : 500, border: `1.5px solid ${on ? colors.green.primary : colors.border.soft}`,
                        background: on ? colors.green.softer : colors.green.surface, color: on ? colors.text.title : colors.text.body,
                      }}>{f.label}</button>
                  )
                })}
              </div>
              <DoseField item={t} onSave={(dose) => setItem(t.id, { dose })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text.muted, cursor: 'pointer', minHeight: 32 }}>
                <input type="checkbox" checked={t.inReport !== false} onChange={(e) => setItem(t.id, { inReport: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: colors.green.primary }} />
                Afficher dans mon rapport médecin
              </label>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label htmlFor="profile-new-treatment" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Ajouter un médicament</label>
        <input id="profile-new-treatment" value={name} maxLength={TREATMENT_NAME_MAX} onChange={(e) => setName(e.target.value)}
          list="profile-treatment-suggestions" placeholder="Ajouter un médicament, ex. Propranolol" style={{ ...input, flex: '1 1 200px' }} />
        <datalist id="profile-treatment-suggestions">
          {knownTreatmentNames().map((n) => <option key={n} value={n} />)}
        </datalist>
        <button type="submit" disabled={!name.trim()} aria-label="Ajouter ce médicament" style={{ ...smallBtn, opacity: name.trim() ? 1 : 0.6 }}>
          <i className="ti ti-plus" aria-hidden="true" /> Ajouter
        </button>
      </form>
    </fieldset>
  )
}

function DoseField({ item, onSave }) {
  const [v, setV] = useState(item.dose || '')
  useEffect(() => { setV(item.dose || '') }, [item.dose])
  return (
    <input value={v} maxLength={60} onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v.trim() !== (item.dose || '')) onSave(v.trim()) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      aria-label={`Dose de ${item.name}`} placeholder="Dose habituelle (facultatif), ex. 40 mg"
      style={{ ...input, width: '100%', fontSize: 14 }} />
  )
}

export function LifestyleSection({ profile, updateProfile, wide, toast }) {
  const ls = profile.lifestyle || {}
  const setAnswer = (key, v) => updateProfile({ lifestyle: { ...ls, [key]: ls[key] === v ? null : v } })
  const setReport = (key, on) => updateProfile({ lifestyle: { ...ls, inReport: { ...(ls.inReport || {}), [key]: on } } })

  return (
    <section aria-labelledby="lifestyle-title" style={card(wide)}>
      <h2 id="lifestyle-title" style={title}>
        <i className="ti ti-heart-handshake" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Mode de vie
      </h2>
      <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: -8, lineHeight: 1.5 }}>
        Facultatif, pour mieux comprendre tes symptômes. Tu choisis ce qui apparaît dans ton rapport médecin.
      </div>
      <MyTreatmentsBlock profile={profile} updateProfile={updateProfile} toast={toast} />
      {LIFESTYLE_ITEMS.map((item) => {
        const inReport = isInReport(profile, item.key)
        return (
          <fieldset key={item.key} style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend style={{ padding: 0, marginBottom: 8, fontSize: 15, fontWeight: 700, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 18, color: colors.text.muted }} aria-hidden="true" /> {item.label}
            </legend>
            {item.hint && <div style={{ fontSize: 12, color: colors.text.soft, marginTop: -4 }}>{item.hint}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.options.map((o) => {
                const active = ls[item.key] === o.v
                return (
                  <button key={o.v} type="button" aria-pressed={active} onClick={() => setAnswer(item.key, o.v)}
                    style={{
                      minHeight: TOUCH_MIN - 4, padding: '0 12px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: o.v === 'nsp' ? 13 : 14, fontWeight: active ? 700 : 500,
                      border: `1.5px solid ${active ? colors.green.primary : colors.border.soft}`,
                      background: active ? colors.green.softer : colors.green.surface,
                      color: active ? colors.text.title : colors.text.body,
                    }}>
                    {o.label}
                  </button>
                )
              })}
            </div>
            {ls[item.key] && ls[item.key] !== 'nsp' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text.muted, cursor: 'pointer', minHeight: 32 }}>
                <input type="checkbox" checked={inReport} onChange={(e) => setReport(item.key, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: colors.green.primary }} />
                Afficher dans mon rapport médecin
              </label>
            )}
          </fieldset>
        )
      })}
    </section>
  )
}
