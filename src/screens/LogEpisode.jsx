import { useState, useEffect, useMemo, useRef } from 'react'
import { conditions, conditionKeys, durations, efficacyLevels, zoneLabels, genderFilteredTriggers } from '../data/conditions'
import { colors, radius, shadow, font, alpha, type, TOUCH_MIN } from '../theme/tokens'

// Particules végétales pour la célébration après sauvegarde
const CELEB_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  const dist = 40 + Math.random() * 30
  return {
    px: Math.cos(angle) * dist,
    py: Math.sin(angle) * dist,
    icon: ['ti-leaf', 'ti-plant', 'ti-flower', 'ti-star'][i % 4],
    color: [colors.green.primary, colors.green.leaf, colors.amber.border, colors.pink.border][i % 4],
    delay: i * 0.04,
  }
})

function SaveCelebration({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <Portal>
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: alpha(colors.green.surface, 70), backdropFilter: 'blur(6px)',
      animation: 'celebFade 1.8s ease both',
    }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* Cercle */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: colors.green.soft, border: `3px solid ${colors.green.primary}`,
          animation: 'celebCircle .5s cubic-bezier(.34,1.56,.64,1) both',
        }} />
        {/* Check */}
        <svg viewBox="0 0 24 24" style={{ position: 'absolute', inset: 30, width: 60, height: 60 }}>
          <path d="M5 12 L10 17 L19 8" fill="none"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ stroke: colors.green.primary,
              strokeDasharray: 24, strokeDashoffset: 24,
              animation: 'celebCheck .5s ease .35s both',
            }} />
        </svg>
        {/* Particules */}
        {CELEB_PARTICLES.map((p, i) => (
          <i key={i} className={`ti ${p.icon}`}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              fontSize: 14, color: p.color,
              '--px': `${p.px}px`, '--py': `${p.py}px`,
              animation: `celebParticle .7s ease ${0.3 + p.delay}s both`,
            }} aria-hidden="true" />
        ))}
      </div>
      <div style={{
        position: 'absolute', bottom: '35%', textAlign: 'center',
        animation: 'fadeInUp .4s ease .5s both',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: colors.green.primaryDark, fontFamily: font.display }}>
          C'est noté !
        </div>
        <div style={{ fontSize: 13, color: colors.text.muted, marginTop: 4 }}>
          Ton jardin te remercie
        </div>
      </div>
    </div>
    </Portal>
  )
}
import BodySilhouette from '../components/BodySilhouette'
import { Screen, ScreenHeader, Chip, PrimaryButton, ConfirmDialog, useToast, Portal } from '../components/ui'
import { useStore } from '../data/store'
import { durationCategory, formatDuration } from '../data/episodeTime'
import TreatmentPicker from '../components/TreatmentPicker'
import { CustomConditionForm, removeCustomCondition } from '../components/CustomConditions'
import { isSelectableCondition, isCustomCondition } from '../data/conditions'

// Palette propre à chaque pathologie — identité visuelle distincte
// Fonds dérivés de l'accent mélangé à la surface du thème : pastel le jour,
// teinte sourde la nuit (voir tokens.js).
const tint = (accent, pct) => `color-mix(in srgb, ${accent} ${pct}%, ${colors.green.surface})`
const condPal = (accent) => ({ bg: tint(accent, 9), accent, iconBg: tint(accent, 18) })
// Palette d'une pathologie (intégrée, personnelle ou ancienne « Autre »)
const palOf = (k) => COND_PALETTE[k] || (conditions[k]?.accent ? condPal(conditions[k].accent) : COND_PALETTE.autre)
const COND_PALETTE = {
  migraine:    condPal('#8B6DB5'),
  maux_de_tete:condPal('#5E7FAA'),
  sii:         condPal('#C4883A'),
  fibro:       condPal('#B5636D'),
  endometriose:condPal('#C45478'),
  eczema:      condPal('#C87E4F'),
  asthme:      condPal('#4E9A86'),
  arthrose:    condPal('#8A7B5E'),
  autre:       { bg: colors.sand.bg, accent: colors.sand.text, iconBg: tint('#8A7B5E', 18) },
}

// Intensité racontée : un mot et une couleur par palier, plus lisibles
// qu'un simple chiffre un jour de crise.
const INTENSITY_WORDS = [
  { max: 0, label: 'Aucune', color: '#7FB089' },
  { max: 2, label: 'Légère', color: '#7FB089' },
  { max: 4, label: 'Présente', color: '#B9CE8E' },
  { max: 6, label: 'Gênante', color: '#E9B85E' },
  { max: 8, label: 'Forte', color: '#D98A5A' },
  { max: 10, label: 'Insupportable', color: '#C47048' },
]
function intensityWord(v) {
  return INTENSITY_WORDS.find((w) => v <= w.max) || INTENSITY_WORDS[INTENSITY_WORDS.length - 1]
}

// =============================================================
// Saisie d'un épisode — étapes guidées, une question par écran
//   1 Quoi · 2 Quand · 3 Où · 4 Intensité · 5 Déclencheurs · 6 Traitement
//   7 Détails et note · 8 Récapitulatif
// Les étapes 3, 5, 6 et 7 se passent ; dès l'étape 2, « Terminer et
// enregistrer » permet de s'arrêter (utile en pleine crise).
// En modification, l'écran s'ouvre sur le récapitulatif.
//
// Champs ajoutés à l'épisode (tous facultatifs, rétrocompatibles) :
//   createdAt       début de l'épisode (peut être dans le passé)
//   ongoing         crise encore en cours
//   endedAt         fin (si terminée) ; durationMinutes calculé
//   duration        catégorie historique ('<1h', '2-4h', '½ jour', '+1j'),
//                   déduite de la durée réelle, pour les stats et le rapport
//   treatmentDose   dose libre (« 50 mg, 1 comprimé »)
//   treatmentAt     heure de prise
//   note            note libre (1000 caractères au plus)
// =============================================================

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const NOTE_MAX = 1000
const DOSE_MAX = 60

function formatWhen(iso) {
  const d = new Date(iso)
  const now = new Date()
  const time = `${d.getHours()} h ${pad(d.getMinutes())}`
  const dayDiff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
  if (dayDiff === 0) return `aujourd'hui à ${time}`
  if (dayDiff === 1) return `hier à ${time}`
  return `${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${time}`
}

// Débuts proposés (calculés à l'ouverture de l'écran)
function startPresets(now) {
  const list = [
    { key: 'now', label: 'Maintenant', at: now },
    { key: '1h', label: 'Il y a 1 heure', at: new Date(now.getTime() - 3600000) },
  ]
  const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0)
  if (now.getHours() >= 10) list.push({ key: 'matin', label: 'Ce matin', at: morning })
  const yEvening = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0)
  list.push({ key: 'hier', label: 'Hier soir', at: yEvening })
  return list
}

const STEPS = [
  { id: 'quoi', title: 'Quelle pathologie ?' },
  { id: 'quand', title: 'Quand ?' },
  { id: 'ou', title: 'Où as-tu mal ?', optional: true },
  { id: 'intensite', title: 'Quelle intensité ?' },
  { id: 'declencheurs', title: 'Un déclencheur ?', optional: true },
  { id: 'traitement', title: 'Un traitement ?', optional: true },
  { id: 'details', title: 'Autre chose à noter ?', optional: true },
  { id: 'recap', title: 'Récapitulatif' },
]

// Bouton de choix commun à toutes les étapes (cible tactile ≥ 44 px)
function Opt({ active, onClick, children, style, ariaLabel, accent }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      style={{
        minHeight: TOUCH_MIN + 4, padding: '0 16px', borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${active ? (accent || colors.green.primary) : colors.border.soft}`,
        background: active ? colors.green.softer : colors.green.surface,
        color: active ? colors.text.title : colors.text.body,
        fontSize: type.base, fontWeight: active ? 700 : 500,
        transition: 'background .15s ease, border-color .15s ease',
        ...style,
      }}>
      {children}
    </button>
  )
}

const fieldLabel = { display: 'block', fontSize: type.sm, fontWeight: 700, color: colors.text.muted, marginBottom: 8 }
const inputStyle = {
  width: '100%', minHeight: TOUCH_MIN + 4, padding: '0 14px', fontSize: type.base, fontFamily: 'inherit', boxSizing: 'border-box',
  border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small, background: colors.green.surface, color: colors.text.body,
}

export default function LogEpisode({ onBack, onSaved, editEpisodeId, bp = 'mobile' }) {
  const { addEpisode, editEpisode, addShortcut, profile, updateProfile, episodes } = useStore()
  const toast = useToast()
  const editing = editEpisodeId ? episodes.find((e) => e.id === editEpisodeId) : null
  const isEditing = !!editing
  const wide = bp === 'desktop'
  const openedAt = useMemo(() => new Date(), [])
  const presets = useMemo(() => startPresets(openedAt), [openedAt])
  const titleRef = useRef(null)

  // ---- Pathologies proposées : favorites d'abord, puis les autres ----
  const hiddenConditions = profile.gender === 'h' ? ['endometriose'] : []
  const favorites = (profile.quickFavorites || []).filter((k) => conditions[k])
  // Pathologies proposées : favorites, intégrées et personnelles actives (l'ancienne
  // « Autre » et les pathologies archivées ne restent visibles que pour l'épisode modifié)
  const orderedKeys = [...favorites, ...conditionKeys.filter((k) => !favorites.includes(k))]
    .filter((k) => isSelectableCondition(k) || k === editing?.condition)
    .filter((k) => !hiddenConditions.includes(k))

  // ---- État du formulaire ----
  const [step, setStep] = useState(isEditing ? STEPS.length - 1 : 0)
  const [condKey, setCondKey] = useState(() => {
    if (editing?.condition) return editing.condition
    if (favorites[0]) return favorites[0]
    const last = episodes.length > 0 ? episodes[episodes.length - 1] : null
    return last?.condition && conditions[last.condition] && last.condition !== 'bienetre' ? last.condition : null
  })
  const [customLabel, setCustomLabel] = useState(() => editing?.customLabel || '')
  const [startPreset, setStartPreset] = useState(isEditing ? 'custom' : 'now')
  const [startAt, setStartAt] = useState(() => (editing ? new Date(editing.createdAt) : openedAt))
  const [ongoing, setOngoing] = useState(() => (editing ? !!editing.ongoing : true))
  const [endAt, setEndAt] = useState(() => (editing?.endedAt ? new Date(editing.endedAt) : null))
  const [whenTouched, setWhenTouched] = useState(false) // pour garder la durée d'un ancien épisode
  const [zones, setZones] = useState(() => editing?.zones || (condKey && conditions[condKey] ? [...conditions[condKey].zones] : []))
  const [intensity, setIntensity] = useState(() => editing?.intensity ?? 5)
  const [triggers, setTriggers] = useState(() => editing?.triggers || [])
  // Traitement : un nom libre (mes traitements, suggestions de la pathologie ou ancien épisode)
  const [treatment, setTreatment] = useState(() => editing?.treatment || 'Aucun')
  const [dose, setDose] = useState(() => editing?.treatmentDose || '')
  const [treatmentAt, setTreatmentAt] = useState(() => (editing?.treatmentAt ? new Date(editing.treatmentAt) : null))
  const [efficacy, setEfficacy] = useState(() => editing?.efficacy || null)
  const [extra, setExtra] = useState(() => editing?.extra || [])
  const [note, setNote] = useState(() => editing?.note || '')
  const [saving, setSaving] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showShortcutPrompt, setShowShortcutPrompt] = useState(false)
  const [confirmSwitch, setConfirmSwitch] = useState(null)
  const [creatingCond, setCreatingCond] = useState(false)
  const [managingConds, setManagingConds] = useState(false)

  const cond = condKey ? conditions[condKey] : null
  const pal = condKey ? palOf(condKey) : null
  const iw = intensityWord(intensity)
  const hiddenTriggers = genderFilteredTriggers[profile.gender] || []
  const visibleTriggers = cond ? cond.triggers.filter((t) => !hiddenTriggers.includes(t)) : []
  const finalTreatment = treatment || 'Aucun'
  const toggle = (val, list, setList) => setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  // Durée : calculée si la crise est terminée ; conservée telle quelle pour
  // un ancien épisode tant que l'étape « Quand » n'a pas été modifiée.
  const minutes = !ongoing && endAt ? Math.round((endAt - startAt) / 60000) : null
  const legacyDuration = isEditing && !whenTouched && !editing.endedAt && !editing.ongoing ? editing.duration : null
  const endInvalid = !ongoing && endAt && endAt <= startAt
  const startInFuture = startAt.getTime() > Date.now() + 60000

  // Titre de l'étape : focus pour les lecteurs d'écran à chaque changement
  useEffect(() => { titleRef.current?.focus() }, [step])

  // ---- Changement de pathologie ----
  const hasFormData = triggers.length > 0 || extra.length > 0 || note.trim() || customLabel.trim()
  function doSwitchCond(k) {
    setCondKey(k)
    setZones(conditions[k] ? [...conditions[k].zones] : [])
    setTriggers([]); setExtra([]); setCustomLabel('')
    setTreatment('Aucun'); setDose(''); setTreatmentAt(null); setEfficacy(null)
  }
  function chooseCondition(k) {
    if (k === condKey) { if (!conditions[k].custom) goNext(); return }
    if (condKey && hasFormData) { setConfirmSwitch(k); return }
    doSwitchCond(k)
    if (!conditions[k].custom) setTimeout(() => setStep(1), 180)
  }

  // ---- Navigation ----
  function canLeave(i) {
    if (STEPS[i].id === 'quoi' && !condKey) { toast('Choisis une pathologie', 'info'); return false }
    if (STEPS[i].id === 'quand') {
      if (startInFuture) { toast('Le début ne peut pas être dans le futur', 'error'); return false }
      // Ancien épisode sans heure de fin : sa durée notée précédemment reste valable
      if (!ongoing && !endAt && !legacyDuration) { toast('Indique l\u2019heure de fin, ou choisis « En cours »', 'info'); return false }
      if (endInvalid) { toast('La fin doit être après le début', 'error'); return false }
    }
    return true
  }
  function goNext() { if (canLeave(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  function goBack() { if (step === 0 || (isEditing && step === STEPS.length - 1)) onBack?.(); else setStep((s) => s - 1) }

  // ---- Enregistrement ----
  function handleSave() {
    if (saving) return
    for (let i = 0; i <= 1; i++) if (!canLeave(i)) { setStep(i); return }
    setSaving(true)
    const episode = {
      condition: condKey,
      createdAt: startAt.toISOString(),
      zones, intensity, triggers,
      treatment: finalTreatment,
      efficacy: finalTreatment === 'Aucun' ? null : efficacy,
      extra,
      ongoing,
      endedAt: !ongoing && endAt ? endAt.toISOString() : null,
      durationMinutes: minutes,
      duration: legacyDuration ?? durationCategory(minutes),
      treatmentDose: finalTreatment === 'Aucun' ? '' : dose.trim().slice(0, DOSE_MAX),
      treatmentAt: finalTreatment === 'Aucun' || !treatmentAt ? null : treatmentAt.toISOString(),
      note: note.trim().slice(0, NOTE_MAX),
    }
    if (cond.custom && customLabel.trim()) episode.customLabel = customLabel.trim()
    if (isEditing) {
      try {
        editEpisode(editEpisodeId, episode)
        toast('Épisode modifié', 'success')
        onSaved?.()
      } catch {
        toast('Erreur lors de la modification', 'error')
        setSaving(false)
      }
      return
    }
    if (addEpisode(episode)) setShowCelebration(true)
    else setSaving(false)
  }

  function handleSaveShortcut() {
    if (cond.custom && !customLabel.trim()) { toast('Nomme ta pathologie avant de créer un raccourci', 'error'); return }
    const baseName = cond.custom && customLabel ? customLabel : cond.label
    const zonesSuffix = zones.length > 0 ? ` (${zones.slice(0, 2).map((z) => zoneLabels[z] || z).join(', ')}${zones.length > 2 ? '…' : ''})` : ''
    addShortcut({
      label: baseName + zonesSuffix + (finalTreatment !== 'Aucun' ? ' — ' + finalTreatment : ''),
      condition: condKey, zones, treatment: finalTreatment, extra,
      ...(cond.custom && customLabel ? { customLabel } : {}),
    })
    toast('Raccourci enregistré', 'success')
    setShowShortcutPrompt(false)
    setTimeout(() => onSaved?.(), 300)
  }

  // ---- Contenu de chaque étape ----
  const S = STEPS[step]
  let content = null

  if (S.id === 'quoi') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="group" aria-label="Pathologies" style={{ display: 'grid', gridTemplateColumns: `repeat(${wide ? 3 : 2}, minmax(0, 1fr))`, gap: 10 }}>
          {orderedKeys.map((k) => {
            const c = conditions[k], p = palOf(k), on = condKey === k
            return (
              <div key={k} style={{ position: 'relative', display: 'flex' }}>
              <button type="button" onClick={() => chooseCondition(k)} aria-pressed={on}
                style={{
                  flex: 1, minHeight: 72, padding: '10px 12px', borderRadius: radius.lg, cursor: 'pointer', fontFamily: 'inherit',
                  border: `2px solid ${on ? p.accent : colors.border.soft}`, background: on ? p.bg : colors.green.surface,
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  boxShadow: on ? `0 0 0 3px ${alpha(p.accent, 18)}` : 'none',
                }}>
                <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: p.iconBg, color: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${c.icon || 'ti-heart-rate-monitor'}`} style={{ fontSize: 22 }} />
                </span>
                <span style={{ fontSize: type.base, fontWeight: on ? 800 : 600, color: colors.text.title, lineHeight: 1.2 }}>
                  {c.label}
                  {favorites.includes(k) && <i className="ti ti-star-filled" style={{ fontSize: 11, color: colors.amber.text, marginLeft: 5 }} aria-label="favorite" />}
                </span>
              </button>
              {managingConds && isCustomCondition(k) && (
                <button type="button" aria-label={`Supprimer ${c.label} de mes pathologies`}
                  onClick={() => { removeCustomCondition({ id: k, profile, updateProfile, toast, episodes }); if (condKey === k) setCondKey(null) }}
                  style={{
                    position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                    border: `2px solid ${colors.green.surface}`, background: colors.danger.text, color: colors.onPrimary, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
              </div>
            )
          })}
          {!creatingCond && (
            <button type="button" onClick={() => { setCreatingCond(true); setManagingConds(false) }}
              style={{
                minHeight: 72, padding: '10px 12px', borderRadius: radius.lg, cursor: 'pointer', fontFamily: 'inherit',
                border: `2px dashed ${colors.border.soft}`, background: 'transparent', color: colors.green.primaryDark,
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', fontSize: type.base, fontWeight: 700,
              }}>
              <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: colors.green.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-plus" style={{ fontSize: 22 }} />
              </span>
              Créer une pathologie
            </button>
          )}
        </div>
        {creatingCond && (
          <CustomConditionForm profile={profile} updateProfile={updateProfile} toast={toast} idPrefix="log-cc"
            onCancel={() => setCreatingCond(false)}
            onCreated={(id) => { setCreatingCond(false); doSwitchCond(id); setTimeout(() => setStep(1), 180) }} />
        )}
        {orderedKeys.some(isCustomCondition) && !creatingCond && (
          <button type="button" onClick={() => setManagingConds(!managingConds)} aria-pressed={managingConds}
            style={{ alignSelf: 'flex-start', minHeight: TOUCH_MIN, padding: '0 4px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <i className={`ti ${managingConds ? 'ti-check' : 'ti-settings'}`} aria-hidden="true" /> {managingConds ? 'Terminé' : 'Gérer mes pathologies'}
          </button>
        )}
        {cond?.custom && (
          <div>
            <label htmlFor="custom-label" style={fieldLabel}>Nom de ta pathologie</label>
            <input id="custom-label" autoFocus value={customLabel} maxLength={60} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ex. Névralgie" style={inputStyle} />
          </div>
        )}
      </div>
    )
  }

  if (S.id === 'quand') {
    const endPresetNow = endAt && Math.abs(endAt - new Date()) < 120000
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={fieldLabel}>Début</div>
          <div role="group" aria-label="Début de l'épisode" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map((p) => (
              <Opt key={p.key} active={startPreset === p.key} onClick={() => { setStartPreset(p.key); setStartAt(p.at); setWhenTouched(true) }}>{p.label}</Opt>
            ))}
            <Opt active={startPreset === 'custom'} onClick={() => { setStartPreset('custom'); setWhenTouched(true) }}>
              <i className="ti ti-calendar" aria-hidden="true" /> Autre date
            </Opt>
          </div>
          {startPreset === 'custom' && (
            <input type="datetime-local" aria-label="Date et heure de début" value={toLocalInput(startAt)} max={toLocalInput(new Date())}
              onChange={(e) => { if (e.target.value) { setStartAt(new Date(e.target.value)); setWhenTouched(true) } }}
              style={{ ...inputStyle, marginTop: 10, maxWidth: 280 }} />
          )}
          <div style={{ fontSize: type.sm, color: startInFuture ? colors.danger.text : colors.text.muted, marginTop: 8 }}>
            {startInFuture ? 'Le début ne peut pas être dans le futur.' : `Début ${formatWhen(startAt.toISOString())}`}
          </div>
        </div>
        <div>
          <div style={fieldLabel}>La crise est…</div>
          <div role="group" aria-label="État de la crise" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <Opt active={ongoing} onClick={() => { setOngoing(true); setWhenTouched(true) }}>Encore en cours</Opt>
            <Opt active={!ongoing} onClick={() => { setOngoing(false); setWhenTouched(true); if (!endAt) setEndAt(new Date()) }}>Terminée</Opt>
          </div>
          {!ongoing && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Opt active={!!endPresetNow} onClick={() => setEndAt(new Date())}>Fin : à l'instant</Opt>
                <input type="datetime-local" aria-label="Date et heure de fin" value={endAt ? toLocalInput(endAt) : ''}
                  min={toLocalInput(startAt)} max={toLocalInput(new Date())}
                  onChange={(e) => e.target.value && setEndAt(new Date(e.target.value))}
                  style={{ ...inputStyle, width: 'auto', maxWidth: 260 }} />
              </div>
              <div aria-live="polite" style={{ fontSize: type.base, fontWeight: 700, marginTop: 10, color: endInvalid ? colors.danger.text : colors.text.title }}>
                {endInvalid ? 'La fin doit être après le début.' : minutes != null ? `Durée : ${formatDuration(minutes)}` : ''}
              </div>
            </div>
          )}
          {ongoing && (
            <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: 8, lineHeight: 1.45 }}>
              Quand ce sera fini, touche « C'est terminé » sur l'accueil : la durée sera calculée.
            </div>
          )}
          {legacyDuration && (
            <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: 8 }}>Durée notée précédemment : {legacyDuration}</div>
          )}
        </div>
      </div>
    )
  }

  if (S.id === 'ou') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: type.sm, color: colors.text.muted, textAlign: 'center' }}>
          Touche les zones concernées. Les zones habituelles de cette pathologie sont déjà cochées.
        </div>
        <BodySilhouette suggested={cond.zones} active={zones} onToggle={(z) => toggle(z, zones, setZones)} />
        <div aria-live="polite" style={{ fontSize: type.base, fontWeight: 700, color: colors.text.title, textAlign: 'center' }}>
          {zones.length ? zones.map((z) => zoneLabels[z] || z).join(', ') : 'Aucune zone sélectionnée'}
        </div>
      </div>
    )
  }

  if (S.id === 'intensite') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div aria-live="polite" style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: font.display, fontSize: 56, fontWeight: 600, color: colors.text.title, lineHeight: 1 }}>{intensity}</span>
          <span style={{ fontSize: type.lg, color: colors.text.muted }}> / 10</span>
          <div style={{ fontSize: type.lg, fontWeight: 800, color: colors.text.title, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', background: iw.color }} /> {iw.label}
          </div>
        </div>
        <div role="group" aria-label="Intensité de 0 à 10" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
          {Array.from({ length: 11 }, (_, n) => {
            const on = intensity === n
            return (
              <button key={n} type="button" onClick={() => setIntensity(n)} aria-pressed={on} aria-label={`Intensité ${n} sur 10`}
                style={{
                  height: 56, borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit', fontSize: type.lg, fontWeight: 800,
                  border: `2px solid ${on ? intensityWord(n).color : colors.border.soft}`,
                  background: on ? intensityWord(n).color : colors.green.surface,
                  color: on ? '#13201A' : colors.text.body,
                }}>{n}</button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.sm, color: colors.text.soft }} aria-hidden="true">
          <span>Aucune douleur</span><span>Insupportable</span>
        </div>
      </div>
    )
  }

  if (S.id === 'declencheurs') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: type.sm, color: colors.text.muted }}>Plusieurs choix possibles. Tu peux aussi passer cette étape.</div>
        <div role="group" aria-label="Déclencheurs possibles" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visibleTriggers.map((t) => (
            <Opt key={t} active={triggers.includes(t)} onClick={() => toggle(t, triggers, setTriggers)} accent={colors.amber.text}>
              {triggers.includes(t) && <i className="ti ti-check" aria-hidden="true" style={{ marginRight: 4 }} />}{t}
            </Opt>
          ))}
        </div>
      </div>
    )
  }

  if (S.id === 'traitement') {
    const tNow = treatmentAt && Math.abs(treatmentAt - new Date()) < 120000
    const tStart = treatmentAt && Math.abs(treatmentAt - startAt) < 60000
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TreatmentPicker
          value={treatment}
          suggestions={(cond.treatment || []).filter((t) => t !== 'Médicament')}
          profile={profile} updateProfile={updateProfile} toast={toast}
          onChange={(n, item) => {
            // Dose préremplie : suit le médicament choisi, sauf si elle a été modifiée à la main
            const prev = (profile.myTreatments || []).find((t) => t.name === treatment)
            const autoFilled = !dose.trim() || (prev?.dose && dose.trim() === prev.dose)
            setTreatment(n)
            if (n === 'Aucun') return
            if (!treatmentAt) setTreatmentAt(new Date())
            if (autoFilled) setDose(item?.dose || '')
          }} />
        {treatment !== 'Aucun' && (
          <>
            <div>
              <label htmlFor="dose" style={fieldLabel}>Dose (facultatif)</label>
              <input id="dose" value={dose} maxLength={DOSE_MAX} onChange={(e) => setDose(e.target.value)} placeholder="Ex. 50 mg, 1 comprimé" style={inputStyle} />
            </div>
            <div>
              <div style={fieldLabel}>Pris…</div>
              <div role="group" aria-label="Heure de prise" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Opt active={!!tNow} onClick={() => setTreatmentAt(new Date())}>À l'instant</Opt>
                <Opt active={!!tStart && !tNow} onClick={() => setTreatmentAt(new Date(startAt))}>Au début de la crise</Opt>
                <input type="datetime-local" aria-label="Date et heure de prise" value={treatmentAt ? toLocalInput(treatmentAt) : ''}
                  max={toLocalInput(new Date())} onChange={(e) => e.target.value && setTreatmentAt(new Date(e.target.value))}
                  style={{ ...inputStyle, width: 'auto', maxWidth: 260 }} />
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Est-ce que ça a soulagé ?</div>
              <div role="group" aria-label="Efficacité du traitement" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {efficacyLevels.map((l) => (
                  <Opt key={l} active={efficacy === l} onClick={() => setEfficacy(efficacy === l ? null : l)}>{l}</Opt>
                ))}
              </div>
              <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: 8 }}>Tu pourras aussi répondre plus tard depuis l'accueil.</div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (S.id === 'details') {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {cond.extra.options.length > 0 && (
          <div>
            <div style={fieldLabel}>{cond.extra.label || 'Symptômes associés'}</div>
            <div role="group" aria-label="Symptômes associés" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cond.extra.options.map((o) => (
                <Opt key={o} active={extra.includes(o)} onClick={() => toggle(o, extra, setExtra)}>
                  {extra.includes(o) && <i className="ti ti-check" aria-hidden="true" style={{ marginRight: 4 }} />}{o}
                </Opt>
              ))}
            </div>
          </div>
        )}
        <div>
          <label htmlFor="note" style={fieldLabel}>Note libre</label>
          <textarea id="note" value={note} maxLength={NOTE_MAX} rows={5} onChange={(e) => setNote(e.target.value)}
            placeholder="Ce que tu faisais, ce que tu as ressenti, ce qui a aidé…"
            style={{ ...inputStyle, minHeight: 120, padding: '12px 14px', lineHeight: 1.5, resize: 'vertical' }} />
          <div style={{ fontSize: type.xs, color: colors.text.soft, textAlign: 'right', marginTop: 4 }}>{note.length} / {NOTE_MAX}</div>
        </div>
      </div>
    )
  }

  if (S.id === 'recap') {
    const rows = [
      { i: 0, label: 'Pathologie', value: cond ? (cond.custom && customLabel ? customLabel : cond.label) : '—' },
      { i: 1, label: 'Quand', value: `Début ${formatWhen(startAt.toISOString())}${ongoing ? ', encore en cours' : minutes != null ? `, durée ${formatDuration(minutes)}` : legacyDuration ? `, durée ${legacyDuration}` : ''}` },
      { i: 2, label: 'Zones', value: zones.length ? zones.map((z) => zoneLabels[z] || z).join(', ') : 'Non précisées' },
      { i: 3, label: 'Intensité', value: `${intensity} / 10, ${iw.label.toLowerCase()}` },
      { i: 4, label: 'Déclencheurs', value: triggers.length ? triggers.join(', ') : 'Aucun' },
      { i: 5, label: 'Traitement', value: finalTreatment === 'Aucun' ? 'Aucun' : [finalTreatment, dose.trim(), treatmentAt && `pris ${formatWhen(treatmentAt.toISOString())}`, efficacy && `efficacité : ${efficacy.toLowerCase()}`].filter(Boolean).join(', ') },
      { i: 6, label: 'Détails', value: [extra.join(', '), note.trim() && `Note : ${note.trim().length > 90 ? note.trim().slice(0, 90) + '…' : note.trim()}`].filter(Boolean).join(' · ') || 'Aucun' },
    ]
    content = (
      <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.green.soft, borderRadius: radius.small, padding: '10px 6px 10px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <dt style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.muted }}>{r.label}</dt>
              <dd style={{ margin: '2px 0 0', fontSize: type.base, color: colors.text.title, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{r.value}</dd>
            </div>
            <button type="button" onClick={() => setStep(r.i)} aria-label={`Modifier : ${r.label}`}
              style={{ minWidth: TOUCH_MIN, height: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.green.primaryDark, cursor: 'pointer', borderRadius: radius.small, fontSize: 18 }}>
              <i className="ti ti-pencil" aria-hidden="true" />
            </button>
          </div>
        ))}
      </dl>
    )
  }

  const isLast = step === STEPS.length - 1
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <Screen bp={bp}>
      {/* En-tête : retour, progression, titre de l'étape */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button type="button" onClick={goBack} aria-label={step === 0 || (isEditing && isLast) ? 'Quitter la saisie' : 'Étape précédente'}
          style={{ width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: radius.small, border: `1px solid ${colors.border.soft}`, background: colors.green.surface, color: colors.text.title, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${step === 0 || (isEditing && isLast) ? 'ti-x' : 'ti-arrow-left'}`} style={{ fontSize: 20 }} aria-hidden="true" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: type.sm, color: colors.text.muted, fontWeight: 700 }}>
            {isEditing ? 'Modifier l\u2019épisode' : 'Noter un épisode'} · étape {step + 1} sur {STEPS.length}
          </div>
          <div role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Progression"
            style={{ height: 6, borderRadius: 3, background: colors.border.soft, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: pal ? pal.accent : colors.green.primary, transition: 'width .3s ease' }} />
          </div>
        </div>
      </div>

      <div key={step} className="anim-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <h1 ref={titleRef} tabIndex={-1} style={{ margin: 0, fontFamily: font.display, fontSize: wide ? type.xl + 4 : type.xl, fontWeight: 600, color: colors.text.title, lineHeight: 1.15, outline: 'none' }}>
          {S.title}
          {S.optional && <span style={{ fontFamily: font.family, fontSize: type.sm, fontWeight: 600, color: colors.text.soft, marginLeft: 8 }}>facultatif</span>}
        </h1>
        {cond && step > 0 && (
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, fontSize: type.sm, fontWeight: 700, color: pal.accent, background: pal.bg, borderRadius: 999, padding: '4px 12px' }}>
            <i className={`ti ${cond.icon || 'ti-heart-rate-monitor'}`} aria-hidden="true" /> {cond.custom && customLabel ? customLabel : cond.label}
          </div>
        )}
        {content}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        {isLast ? (
          <PrimaryButton icon={saving ? 'ti-loader-2' : 'ti-check'} onClick={handleSave} disabled={saving} wide={wide}>
            {saving ? 'Enregistrement…' : isEditing ? 'Enregistrer les modifications' : 'Enregistrer'}
          </PrimaryButton>
        ) : (
          <PrimaryButton icon="ti-arrow-right" onClick={goNext} wide={wide}>
            {S.optional ? 'Suivant' : 'Continuer'}
          </PrimaryButton>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {S.optional && !isLast && (
            <button type="button" onClick={() => setStep((s) => s + 1)}
              style={{ minHeight: TOUCH_MIN, padding: '0 14px', border: 'none', background: 'transparent', color: colors.text.muted, fontSize: type.base, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Passer
            </button>
          )}
          {step >= 1 && !isLast && (
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ minHeight: TOUCH_MIN, padding: '0 14px', border: 'none', background: 'transparent', color: colors.green.primaryDark, fontSize: type.base, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <i className="ti ti-check" aria-hidden="true" /> Terminer et enregistrer
            </button>
          )}
        </div>
      </div>

      {showCelebration && (
        <SaveCelebration onDone={() => { setShowCelebration(false); setShowShortcutPrompt(true) }} />
      )}
      {showShortcutPrompt && (
        <Portal>
        <div role="dialog" aria-label="Enregistrer comme raccourci" style={{
          position: 'fixed', bottom: bp === 'desktop' ? 0 : 68, left: 0, right: 0, zIndex: 9999,
          background: colors.green.surface, borderTop: `1.5px solid ${colors.border.soft}`,
          padding: '16px 20px', boxShadow: shadow.nav,
        }}>
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="ti ti-bolt" style={{ fontSize: 20, color: colors.amber.text, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, fontSize: type.base, color: colors.text.body }}>Enregistrer comme raccourci ?</span>
            <button onClick={handleSaveShortcut} style={{ minHeight: TOUCH_MIN, border: 'none', background: colors.green.primary, color: colors.onPrimary, padding: '0 16px', borderRadius: radius.small, fontSize: type.base, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
            <button onClick={() => { setShowShortcutPrompt(false); setTimeout(() => onSaved?.(), 100) }} style={{ minHeight: TOUCH_MIN, border: `1.5px solid ${colors.border.soft}`, background: 'transparent', color: colors.text.muted, padding: '0 16px', borderRadius: radius.small, fontSize: type.base, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
          </div>
        </div>
        </Portal>
      )}
      <ConfirmDialog
        open={!!confirmSwitch}
        title="Changer de pathologie ?"
        message="Les déclencheurs, détails et note déjà saisis seront effacés."
        confirmLabel="Changer"
        cancelLabel="Annuler"
        danger
        onConfirm={() => { doSwitchCond(confirmSwitch); setConfirmSwitch(null); setTimeout(() => setStep(1), 150) }}
        onCancel={() => setConfirmSwitch(null)}
      />
    </Screen>
  )
}
