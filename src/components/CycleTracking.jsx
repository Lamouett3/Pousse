import { useState } from 'react'
import { colors, radius, type, TOUCH_MIN } from '../theme/tokens'
import { Toggle } from './ui'
import {
  CYCLE_MODES, FLOW_LEVELS, hasPredictions, normalizePeriods, ongoingPeriod, periodLength, maxFlow,
  cycleStats, endPeriodPatch, setFlowPatch, upsertPeriodPatch, deletePeriodPatch, dayKeyOf, daysBetween, parseDay,
} from '../data/cycle'

// =============================================================
// Interface du suivi du cycle (voir data/cycle.js pour les calculs)
//   CycleModePicker     situation de vie
//   PeriodsSection      Profil : cycle calculé, fertilité, règles notées
//   PeriodTodayControls Accueil : début, abondance du jour, fin des règles
// =============================================================

const fmt = (k, opts = { day: 'numeric', month: 'short' }) => parseDay(k).toLocaleDateString('fr-FR', opts)
const flowLabel = (v) => FLOW_LEVELS.find((f) => f.v === v)?.label.toLowerCase()

const chip = (on, accent = colors.pink.border) => ({
  minHeight: TOUCH_MIN, padding: '0 14px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
  border: `2px solid ${on ? accent : colors.border.soft}`, background: on ? colors.pink.soft : colors.green.surface,
  color: on ? colors.pink.text : colors.text.body, fontSize: type.sm, fontWeight: on ? 700 : 500,
})
const input = {
  minHeight: TOUCH_MIN, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
  border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
}
const linkBtn = {
  minHeight: TOUCH_MIN, padding: '0 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
  color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5,
}
const note = { fontSize: type.sm, color: colors.text.muted, lineHeight: 1.5 }

// ---- Situation de vie ----
export function CycleModePicker({ profile, onChange }) {
  const mode = profile.cycleMode || 'natural'
  const current = CYCLE_MODES.find((m) => m.v === mode)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="group" aria-label="Ma situation" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {CYCLE_MODES.map((m) => {
          const on = mode === m.v
          return (
            <button key={m.v} type="button" aria-pressed={on} onClick={() => onChange(m.v)}
              style={{
                minHeight: TOUCH_MIN, padding: '6px 12px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                border: `2px solid ${on ? colors.green.primary : colors.border.soft}`, background: on ? colors.green.softer : colors.green.surface,
                color: on ? colors.text.title : colors.text.body, fontSize: 14, fontWeight: on ? 700 : 500, lineHeight: 1.25,
              }}>{m.label}</button>
          )
        })}
      </div>
      {current?.hint && <div style={note}>{current.hint}</div>}
      {mode === 'no_period' && <div style={note}>Pas de phases prévues. Tu peux noter des saignements quand il y en a.</div>}
      {mode === 'menopause' && (
        <div style={note}>
          Pas de prévisions. Tu peux noter des saignements : après la ménopause, ils sont à signaler à ton médecin.
        </div>
      )}
      {mode === 'pregnancy' && <div style={note}>Les prévisions et la saisie des règles sont en pause pendant la grossesse.</div>}
    </div>
  )
}

// ---- Accueil : aujourd'hui ----
export function PeriodTodayControls({ profile, updateProfile, toast, onStart }) {
  const today = dayKeyOf(new Date())
  const ongoing = ongoingPeriod(profile, today)
  const mode = profile.cycleMode || 'natural'
  const bleedingWord = mode === 'menopause' || mode === 'no_period'
  if (!ongoing) {
    return (
      <button type="button" onClick={onStart}
        style={{
          width: '100%', minHeight: TOUCH_MIN, border: `1.5px solid ${colors.pink.border}`, background: colors.pink.soft, color: colors.pink.text,
          borderRadius: radius.small, fontSize: type.sm, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}>
        <i className="ti ti-droplet-filled" style={{ fontSize: 16, color: colors.pink.border }} aria-hidden="true" />
        {bleedingWord ? 'Noter un saignement aujourd\u2019hui' : 'Mes règles commencent aujourd\u2019hui'}
      </button>
    )
  }
  const day = daysBetween(ongoing.start, today) + 1
  const level = ongoing.flow?.[today]
  return (
    <section aria-label="Règles en cours" style={{ display: 'flex', flexDirection: 'column', gap: 10, background: colors.pink.soft, borderRadius: radius.small, padding: 12 }}>
      <div style={{ fontSize: type.base, fontWeight: 700, color: colors.pink.text, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-droplet-filled" aria-hidden="true" /> {bleedingWord ? 'Saignement en cours' : 'Règles en cours'}, jour {day}
      </div>
      <div>
        <div style={{ fontSize: type.xs, fontWeight: 700, color: colors.text.muted, marginBottom: 6 }}>Abondance aujourd'hui</div>
        <div role="group" aria-label="Abondance aujourd'hui" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {FLOW_LEVELS.map((f) => (
            <button key={f.v} type="button" aria-pressed={level === f.v}
              onClick={() => updateProfile(setFlowPatch(profile, ongoing.id, today, f.v))}
              style={{ ...chip(level === f.v), padding: '0 4px', fontSize: 13 }}>{f.label}</button>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => {
        updateProfile(endPeriodPatch(profile, today))
        toast(`${bleedingWord ? 'Saignement' : 'Règles'} terminé${bleedingWord ? '' : 'es'} : ${day} jour${day > 1 ? 's' : ''}`, 'success')
      }}
        style={{
          minHeight: TOUCH_MIN, border: 'none', borderRadius: radius.small, background: colors.green.primary, color: colors.onPrimary,
          fontSize: type.sm, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
        {bleedingWord ? 'Le saignement est terminé' : 'Mes règles sont terminées'}
      </button>
    </section>
  )
}

// ---- Profil : une règle de la liste (affichage + modification) ----
function PeriodRow({ p, profile, updateProfile, toast }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(p.start)
  const [end, setEnd] = useState(p.end || '')
  const len = periodLength(p)
  const ongoing = ongoingPeriod(profile)?.id === p.id
  const top = maxFlow(p)
  const title = p.end ? `Du ${fmt(p.start)} au ${fmt(p.end)}` : ongoing ? `Depuis le ${fmt(p.start)}` : `Le ${fmt(p.start, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const detail = [len ? `${len} jour${len > 1 ? 's' : ''}` : ongoing ? 'en cours' : 'fin non notée', top && `abondance max. : ${flowLabel(top)}`].filter(Boolean).join(', ')

  function save() {
    const r = upsertPeriodPatch(profile, { id: p.id, start, end: end || null })
    if (r.error) { toast(r.error, 'error'); return }
    updateProfile(r.patch); setEditing(false); toast('Règles modifiées', 'success')
  }
  function remove() {
    const before = normalizePeriods(profile)
    updateProfile(deletePeriodPatch(profile, p.id))
    toast('Règles supprimées', 'info', { duration: 5000, actionLabel: 'Annuler', action: () => updateProfile({ periods: before, lastPeriod: before[0]?.start || '', periodHistory: before.map((x) => x.start).slice(0, 24) }) })
  }
  const days = p.end && len <= 10 ? Array.from({ length: len }, (_, i) => { const d = parseDay(p.start); d.setDate(d.getDate() + i); return dayKeyOf(d) }) : []

  return (
    <li style={{ background: colors.green.surface, border: `1px solid ${colors.border.soft}`, borderRadius: radius.small, padding: '8px 6px 8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-droplet-filled" style={{ color: colors.pink.border, fontSize: 16 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text.title }}>{title}</div>
          <div style={{ fontSize: 13, color: colors.text.muted }}>{detail}</div>
        </div>
        <button type="button" onClick={() => setEditing(!editing)} aria-expanded={editing} aria-label={`Modifier les règles : ${title}`}
          style={{ width: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.green.primaryDark, cursor: 'pointer', fontSize: 18 }}>
          <i className="ti ti-pencil" aria-hidden="true" />
        </button>
        <button type="button" onClick={remove} aria-label={`Supprimer les règles : ${title}`}
          style={{ width: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.danger.text, cursor: 'pointer', fontSize: 18 }}>
          <i className="ti ti-trash" aria-hidden="true" />
        </button>
      </div>
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 6px 4px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <label style={{ fontSize: 13, color: colors.text.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
              Début<input type="date" value={start} max={dayKeyOf(new Date())} onChange={(e) => setStart(e.target.value)} style={input} />
            </label>
            <label style={{ fontSize: 13, color: colors.text.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
              Fin<input type="date" value={end} min={start} max={dayKeyOf(new Date())} onChange={(e) => setEnd(e.target.value)} style={input} />
            </label>
          </div>
          {days.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.muted, marginBottom: 6 }}>Abondance par jour</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {days.map((k) => (
                  <div key={k} role="group" aria-label={`Abondance du ${fmt(k)}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 64, fontSize: 13, color: colors.text.body }}>{fmt(k)}</span>
                    {FLOW_LEVELS.map((f) => (
                      <button key={f.v} type="button" aria-pressed={p.flow?.[k] === f.v} aria-label={`${f.label}, ${fmt(k)}`}
                        onClick={() => updateProfile(setFlowPatch(profile, p.id, k, f.v))}
                        style={{ ...chip(p.flow?.[k] === f.v), minHeight: 36, padding: '0 8px', fontSize: 12 }}>{f.label}</button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={save} style={{ ...linkBtn, background: colors.green.primary, color: colors.onPrimary, borderRadius: radius.small, padding: '0 16px' }}>Enregistrer</button>
            <button type="button" onClick={() => { setEditing(false); setStart(p.start); setEnd(p.end || '') }} style={linkBtn}>Annuler</button>
          </div>
        </div>
      )}
    </li>
  )
}

// ---- Profil : section complète ----
export function PeriodsSection({ profile, updateProfile, toast }) {
  const list = normalizePeriods(profile)
  const stats = cycleStats(profile)
  const [showAll, setShowAll] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const predictions = hasPredictions(profile)
  const bleedingWord = ['menopause', 'no_period'].includes(profile.cycleMode)

  function addPast(e) {
    e.preventDefault()
    const r = upsertPeriodPatch(profile, { start, end: end || null })
    if (r.error) { toast(r.error, 'error'); return }
    updateProfile(r.patch); setStart(''); setEnd('')
    toast(bleedingWord ? 'Saignement ajouté' : 'Règles ajoutées', 'success')
  }

  return (
    <section aria-labelledby="periods-title" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
      <h3 id="periods-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.text.title }}>
        {bleedingWord ? 'Mes saignements' : 'Mes règles'}
      </h3>

      {predictions && (
        <div style={{ background: colors.green.surface, borderRadius: radius.small, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stats.count >= 2 ? (
            <>
              <div style={{ fontSize: 15, color: colors.text.title }}>
                Cycle moyen : <b>{stats.avg} jours</b>
              </div>
              <div style={note}>
                Calculé sur {stats.count} cycles ({Math.min(...stats.lengths) === Math.max(...stats.lengths) ? `tous de ${stats.avg} jours` : `de ${Math.min(...stats.lengths)} à ${Math.max(...stats.lengths)} jours`}).
                {stats.avgPeriod ? ` Règles : ${stats.avgPeriod} jours en moyenne.` : ''}
              </div>
              {stats.irregular && (
                <div style={{ ...note, color: colors.amber.text }}>
                  Tes cycles varient de plus d'une semaine. C'est fréquent, mais tu peux en parler à ton médecin.
                </div>
              )}
            </>
          ) : (
            <div style={note}>
              Note au moins 3 débuts de règles pour que la durée du cycle soit calculée. En attendant, la durée indiquée ci-dessus est utilisée.
            </div>
          )}
        </div>
      )}

      {predictions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={() => updateProfile({ fertileWindowOn: !profile.fertileWindowOn })}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: colors.text.title }}>Fenêtre de fertilité (indicative)</span>
            <Toggle on={!!profile.fertileWindowOn} />
          </button>
          <div style={{ ...note, fontSize: 12 }}>
            Estimation calendaire, affichée sur le calendrier de l'historique. Elle n'est pas fiable pour éviter ni pour planifier une grossesse : ce n'est pas une méthode de contraception.
          </div>
        </div>
      )}

      {list.length > 0 && (
        <ul aria-label={bleedingWord ? 'Saignements notés' : 'Règles notées'} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(showAll ? list.slice(0, 24) : list.slice(0, 4)).map((p) => (
            <PeriodRow key={p.id} p={p} profile={profile} updateProfile={updateProfile} toast={toast} />
          ))}
        </ul>
      )}
      {list.length > 4 && (
        <button type="button" onClick={() => setShowAll(!showAll)} style={{ ...linkBtn, alignSelf: 'flex-start', padding: 0 }}>
          {showAll ? 'Afficher moins' : `Voir tout (${Math.min(list.length, 24)})`}
        </button>
      )}

      {/* noValidate : messages d'erreur en français (upsertPeriodPatch) plutôt que les bulles du navigateur */}
      <form onSubmit={addPast} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.muted }}>
          {bleedingWord ? 'Ajouter un saignement passé' : 'Ajouter des règles passées'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <label style={{ fontSize: 13, color: colors.text.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Début<input type="date" value={start} max={dayKeyOf(new Date())} onChange={(e) => setStart(e.target.value)} style={input} />
          </label>
          <label style={{ fontSize: 13, color: colors.text.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Fin (facultatif)<input type="date" value={end} min={start || undefined} max={dayKeyOf(new Date())} onChange={(e) => setEnd(e.target.value)} style={input} />
          </label>
          <button type="submit" disabled={!start} aria-label={bleedingWord ? 'Ajouter ce saignement' : 'Ajouter ces règles'}
            style={{ ...linkBtn, background: start ? colors.green.primary : colors.border.soft, color: start ? colors.onPrimary : colors.text.muted, borderRadius: radius.small, padding: '0 16px' }}>
            <i className="ti ti-plus" aria-hidden="true" /> Ajouter
          </button>
        </div>
      </form>
    </section>
  )
}
