import { useState, useEffect, useRef, useMemo } from 'react'
import { colors, radius, font, type, TOUCH_MIN } from '../theme/tokens'
import { useToast, Portal } from '../components/ui'
import { useStore } from '../data/store'
import { conditions, conditionKeys, isSelectableCondition } from '../data/conditions'
import { withoutBienetre } from '../data/stats'
import TreatmentPicker from '../components/TreatmentPicker'
import { myTreatments } from '../data/lifestyle'

// =============================================================
// Saisie express — « mode crise »
// Pour les moments où ça va mal : trois gestes (quoi, combien, traitement)
// puis Enregistrer. Durée et déclencheurs peuvent être complétés plus tard
// depuis l'historique (bouton Modifier).
//
// L'écran s'affiche en plein écran, dans le thème en cours (jour ou
// « jardin de nuit »), avec de grandes cibles tactiles.
// =============================================================

const DEFAULT_CONDITIONS = ['migraine', 'sii', 'fibro']
const MAX_CHOICES = 3
// Pathologies favorites choisies par l'utilisateur (profile.quickFavorites)
export const MAX_FAVORITES = 4

const INTENSITY_WORDS = [
  { max: 2, label: 'Légère' },
  { max: 4, label: 'Présente' },
  { max: 6, label: 'Gênante' },
  { max: 8, label: 'Forte' },
  { max: 10, label: 'Insupportable' },
]
const intensityWord = (v) => (INTENSITY_WORDS.find((w) => v <= w.max) || INTENSITY_WORDS[INTENSITY_WORDS.length - 1]).label

// Pathologies proposées : les favorites choisies par l'utilisateur ;
// à défaut, les plus notées, complétées par un choix par défaut.
function pickConditions(episodes, favorites) {
  const favs = (favorites || []).filter(isSelectableCondition)
  if (favs.length) return favs.slice(0, MAX_FAVORITES)
  const counts = {}
  withoutBienetre(episodes).forEach((e) => {
    if (isSelectableCondition(e.condition)) counts[e.condition] = (counts[e.condition] || 0) + 1
  })
  const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const fill = DEFAULT_CONDITIONS.filter((k) => isSelectableCondition(k) && !ranked.includes(k))
  return [...ranked, ...fill].slice(0, MAX_CHOICES)
}

// Bouton de choix réutilisé pour les trois questions
function Choice({ active, onClick, children, style, ariaLabel }) {
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      style={{
        minHeight: TOUCH_MIN + 4, borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
        border: `2px solid ${active ? colors.green.primary : colors.border.soft}`,
        background: active ? colors.green.softer : colors.green.surface,
        color: active ? colors.text.title : colors.text.muted,
        fontSize: type.base, fontWeight: active ? 800 : 600,
        transition: 'background .15s ease, border-color .15s ease, color .15s ease',
        ...style,
      }}>
      {children}
    </button>
  )
}

export default function QuickLog({ onClose, onMoreDetails }) {
  const { episodes, addEpisode, profile, updateProfile } = useStore()
  const toast = useToast()
  const dialogRef = useRef(null)

  const favorites = profile.quickFavorites || []
  const hasFavorites = favorites.some((k) => conditions[k])
  const choices = useMemo(() => pickConditions(episodes, favorites), [episodes, favorites])
  const [editingFavs, setEditingFavs] = useState(false)
  const lastReal = useMemo(() => {
    const real = withoutBienetre(episodes)
    return real.length ? real[real.length - 1] : null
  }, [episodes])

  // Favorites choisies : la première est présélectionnée.
  // Sinon : la dernière pathologie notée si elle est proposée.
  const [condKey, setCondKey] = useState(() =>
    hasFavorites ? choices[0]
      : lastReal && choices.includes(lastReal.condition) ? lastReal.condition : choices[0])

  function toggleFavorite(k) {
    const current = favorites.filter((f) => conditions[f])
    if (current.includes(k)) {
      const next = current.filter((f) => f !== k)
      updateProfile({ quickFavorites: next })
      if (condKey === k && next.length) setCondKey(next[0])
    } else if (current.length < MAX_FAVORITES) {
      const next = [...current, k]
      updateProfile({ quickFavorites: next })
      if (current.length === 0) setCondKey(k)
    } else {
      toast(`${MAX_FAVORITES} favorites au maximum : retire-en une d\u2019abord`, 'info')
    }
  }
  const [intensity, setIntensity] = useState(6)
  const [treatment, setTreatment] = useState('Aucun')
  // Une crise notée « vite » est le plus souvent en cours : elle apparaîtra
  // sur l'accueil avec « C'est terminé » pour enregistrer la fin et la durée.
  const [ongoing, setOngoing] = useState(true)
  const [saving, setSaving] = useState(false)

  const cond = conditions[condKey]
  // Changer de pathologie : on garde le traitement s'il fait partie de mes
  // traitements ou des suggestions de la nouvelle pathologie, sinon « Aucun »
  function selectCondition(k) {
    setCondKey(k)
    const keep = ['Aucun', ...(conditions[k]?.treatment || []), ...myTreatments(profile).map((t) => t.name)]
    if (!keep.includes(treatment)) setTreatment('Aucun')
  }

  // Échap ferme ; le focus est placé dans la fenêtre à l'ouverture
  useEffect(() => {
    const el = dialogRef.current
    el?.focus()
    function onKey(e) { if (e.key === 'Escape') onClose() }
    el?.addEventListener('keydown', onKey)
    return () => el?.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    if (!cond || saving) return
    setSaving(true)
    const saved = addEpisode({
      condition: condKey,
      zones: cond.zones || [],
      intensity,
      duration: '',
      triggers: [],
      treatment,
      efficacy: null,
      extra: [],
      ongoing,
    })
    if (saved) {
      toast(ongoing ? 'Épisode enregistré. Touche « C\u2019est terminé » sur l\u2019accueil quand la crise sera finie.' : 'Épisode enregistré. Tu pourras le compléter depuis l\u2019historique.', 'success')
      onClose()
    } else {
      setSaving(false)
    }
  }

  const sectionTitle = { fontSize: type.md, fontWeight: 700, color: colors.text.title, margin: 0 }

  return (
    <Portal>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="quicklog-title"
        className="anim-fadeIn"
        style={{
          position: 'fixed', inset: 0, zIndex: 20000, overflowY: 'auto',
          background: colors.green.pageBg, color: colors.text.body, fontFamily: font.family,
          outline: 'none',
        }}>
        <div style={{
          maxWidth: 480, margin: '0 auto', minHeight: '100%', boxSizing: 'border-box',
          padding: '24px 18px calc(24px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', gap: 26,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 id="quicklog-title" style={{ margin: 0, fontFamily: font.display, fontSize: 30, fontWeight: 600, color: colors.text.title, lineHeight: 1.1 }}>
                Noter vite
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: type.base, color: colors.text.muted, lineHeight: 1.45 }}>
                Trois gestes. Les détails pourront attendre.
              </p>
            </div>
            <button onClick={onClose} aria-label="Fermer"
              style={{
                width: 48, height: 48, flexShrink: 0, borderRadius: radius.small,
                border: `1px solid ${colors.border.soft}`, background: colors.green.surface,
                color: colors.text.title, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
              <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
            </button>
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={sectionTitle}>Quoi ?</h2>
              <button onClick={() => setEditingFavs(!editingFavs)} aria-expanded={editingFavs}
                aria-label={editingFavs ? 'Terminer le choix des favorites' : 'Choisir mes pathologies favorites'}
                style={{
                  minHeight: TOUCH_MIN, padding: '0 12px', border: 'none', background: 'transparent', cursor: 'pointer',
                  color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <i className={`ti ${editingFavs ? 'ti-check' : 'ti-star'}`} aria-hidden="true" /> {editingFavs ? 'Terminé' : 'Modifier'}
              </button>
            </div>
            {editingFavs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: type.sm, color: colors.text.muted, lineHeight: 1.45 }}>
                  Choisis jusqu'à {MAX_FAVORITES} pathologies. Elles s'afficheront ici à chaque fois, la première étant présélectionnée.
                </div>
                <div role="group" aria-label="Pathologies favorites" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {conditionKeys.filter(isSelectableCondition).map((k) => {
                    const idx = favorites.indexOf(k)
                    const on = idx !== -1
                    return (
                      <Choice key={k} active={on} onClick={() => toggleFavorite(k)}
                        ariaLabel={`${conditions[k].label}${on ? `, favorite n° ${idx + 1}` : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', textAlign: 'left', justifyContent: 'flex-start' }}>
                        <i className={`ti ${conditions[k].icon || 'ti-heart-rate-monitor'}`} style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ flex: 1, lineHeight: 1.2 }}>{conditions[k].label}</span>
                        {on && (
                          <span aria-hidden="true" style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0, fontSize: 12, fontWeight: 800,
                            background: colors.green.primary, color: colors.onPrimary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{idx + 1}</span>
                        )}
                      </Choice>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${choices.length === 4 ? 2 : choices.length}, minmax(0, 1fr))`, gap: 10 }}>
                {choices.map((k) => (
                  <Choice key={k} active={condKey === k} onClick={() => selectCondition(k)}
                    style={{ minHeight: choices.length === 4 ? 64 : 84, display: 'flex', flexDirection: choices.length === 4 ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 6px', fontSize: type.base }}>
                    <i className={`ti ${conditions[k].icon || 'ti-heart-rate-monitor'}`} style={{ fontSize: 24 }} aria-hidden="true" />
                    <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{conditions[k].label}</span>
                  </Choice>
                ))}
              </div>
            )}
            {!editingFavs && !hasFavorites && (
              <div style={{ fontSize: type.xs, color: colors.text.soft }}>
                Ces pathologies sont choisies d'après tes épisodes. Touche « Modifier » pour choisir tes favorites.
              </div>
            )}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <h2 style={sectionTitle}>Quelle intensité ?</h2>
              <div aria-live="polite" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: type.sm, color: colors.text.muted, fontWeight: 700 }}>{intensityWord(intensity)}</span>
                <span style={{ fontFamily: font.display, fontSize: type.display, fontWeight: 600, color: colors.amber.text, lineHeight: 1 }}>{intensity}</span>
              </div>
            </div>
            <div role="group" aria-label="Intensité de 1 à 10" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const active = intensity === n
                return (
                  <button key={n} onClick={() => setIntensity(n)} aria-pressed={active} aria-label={`Intensité ${n} sur 10`}
                    style={{
                      height: 56, borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit',
                      border: `2px solid ${active ? colors.amber.text : colors.border.soft}`,
                      background: active ? colors.amber.text : colors.green.surface,
                      color: active ? colors.green.pageBg : colors.text.body,
                      fontSize: type.lg, fontWeight: 800,
                    }}>
                    {n}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: type.sm, color: colors.text.soft }} aria-hidden="true">
              <span>Supportable</span><span>Insupportable</span>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={sectionTitle}>La crise est…</h2>
            <div role="group" aria-label="État de la crise" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <Choice active={ongoing} onClick={() => setOngoing(true)}>Encore en cours</Choice>
              <Choice active={!ongoing} onClick={() => setOngoing(false)}>Déjà terminée</Choice>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={sectionTitle}>Traitement pris ?</h2>
            <TreatmentPicker
              value={treatment}
              onChange={(n) => setTreatment(n)}
              suggestions={(cond?.treatment || []).filter((t) => t !== 'Médicament')}
              profile={profile} updateProfile={updateProfile} toast={toast} />
          </section>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
            <button onClick={handleSave} disabled={!cond || saving}
              style={{
                width: '100%', minHeight: 64, border: 'none', borderRadius: radius.lg,
                background: colors.green.primary, color: colors.onPrimary,
                fontSize: 19, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={onMoreDetails}
              style={{
                width: '100%', minHeight: TOUCH_MIN, border: 'none', background: 'transparent',
                color: colors.green.primaryDark, fontSize: type.base, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>
              Faire une saisie complète
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
