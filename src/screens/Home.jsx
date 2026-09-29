import { useState, useRef, useEffect } from 'react'
import { colors, radius, shadow, font, alpha } from '../theme/tokens'
import { Screen, StreakBadge, PrimaryButton, AnimatedNumber, ConfirmDialog, useToast, Portal } from '../components/ui'
import { type, TOUCH_MIN } from '../theme/tokens'
import GrowingGarden from '../components/GrowingGarden'
import PlanetaryWidget from '../components/PlanetaryWidget'
import { useStore } from '../data/store'
import { gardenLoggedDays, currentStreak, dayKey, getCyclePhase, getUpcomingPhases, logPeriodStart, CYCLE_PHASES, getEffectivePhaseDurations } from '../data/storage'
import { currentAccountName } from '../data/auth'
import { conditions } from '../data/conditions'
import { needsEfficacyFollowUp } from '../data/stats'
import { endEpisodePatch, formatDuration } from '../data/episodeTime'
import { PeriodTodayControls } from '../components/CycleTracking'
import { FEELING_MOODS, FEELING_ENERGY, FEELING_SYMPTOMS, genderKey, feelingParts } from '../data/feelings'

const CYCLE_COLORS = {
  pink: { bg: colors.pink.soft, text: colors.pink.text, accent: '#D4537E' },
  green: { bg: colors.green.soft, text: colors.green.primaryDark, accent: colors.green.primary },
  amber: { bg: colors.amber.bg, text: colors.amber.text, accent: colors.amber.border },
  sand: { bg: colors.sand.bg, text: colors.sand.text, accent: colors.sand.faint },
}

const GARDEN_GOAL = 7

export default function Home({ onLog, onQuickLog, onSeeHistory, bp = 'mobile', ecouteSignal = 0 }) {
  const { episodes, profile, updateProfile, addEpisode, editEpisode, shortcuts, addShortcut, removeShortcut, cycleLogs, addCycleLog } = useStore()
  const toast = useToast()
  const [confirmHarvest, setConfirmHarvest] = useState(false)
  const [activeShortcut, setActiveShortcut] = useState(null)
  const [shortcutIntensity, setShortcutIntensity] = useState(5)
  const [shortcutOngoing, setShortcutOngoing] = useState(true)
  const [confirmDeleteShortcut, setConfirmDeleteShortcut] = useState(null)
  const [pressingShortcutId, setPressingShortcutId] = useState(null)
  const [confirmPeriod, setConfirmPeriod] = useState(false)
  const longPressRef = useRef(null)
  const gardenDays = gardenLoggedDays(episodes, profile.gardenStartDate)
  const gardenDayCount = gardenDays.size
  const gardenComplete = gardenDayCount >= GARDEN_GOAL
  const streak = currentStreak(episodes)
  const today = dayKey(new Date())
  const loggedToday = episodes.some((e) => dayKey(e.createdAt) === today)
  const cyclePhase = (profile.gender === 'f' || profile.gender === 'n') ? getCyclePhase(profile) : null

  const userName = currentAccountName()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bel après-midi' : 'Bonsoir'
  const todayLabel = (() => {
    const t = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return t.charAt(0).toUpperCase() + t.slice(1)
  })()
  const wide = bp === 'desktop'
  const isTablet = bp === 'tablet'

  function handleHarvest() {
    updateProfile({
      completedGardens: (profile.completedGardens || 0) + 1,
      gardenStartDate: today,
    })
    setConfirmHarvest(false)
    toast('Récolte terminée ! Un nouveau cycle commence.', 'success')
  }

  function handleAllGood() {
    addEpisode({
      condition: 'bienetre',
      zones: [],
      intensity: 0,
      duration: '',
      triggers: [],
      treatment: 'Aucun',
      efficacy: null,
      extra: [],
    })
    toast('Journée enregistrée, continue comme ça !', 'success')
  }

  function handleShortcutTap(sc) {
    setActiveShortcut(sc)
    setShortcutIntensity(5)
  }

  function handleShortcutSave() {
    if (!activeShortcut) return
    addEpisode({
      condition: activeShortcut.condition,
      zones: activeShortcut.zones || [],
      intensity: shortcutIntensity,
      duration: '',
      ongoing: shortcutOngoing,
      triggers: [],
      treatment: activeShortcut.treatment || 'Aucun',
      efficacy: null,
      extra: activeShortcut.extra || [],
      ...(activeShortcut.customLabel ? { customLabel: activeShortcut.customLabel } : {}),
    })
    toast(shortcutOngoing ? 'Épisode enregistré. Touche « C\u2019est terminé » quand la crise sera finie.' : 'Épisode enregistré', 'success')
    setActiveShortcut(null)
    setShortcutOngoing(true)
  }

  function handleShortcutLongPressStart(sc) {
    setPressingShortcutId(sc.id)
    longPressRef.current = setTimeout(() => {
      setConfirmDeleteShortcut(sc)
      longPressRef.current = null
      setPressingShortcutId(null)
    }, 500)
  }

  function handleShortcutLongPressEnd() {
    setPressingShortcutId(null)
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  const gardenProgressText = gardenDayCount === 0
    ? 'Note un premier épisode pour planter ta première pousse'
    : gardenComplete
      ? 'Ton jardin est magnifique !'
      : null

  // Cycle condensé en pastille enrichie
  const cyclePill = cyclePhase && (
    <div title={`${cyclePhase.label} — jour ${cyclePhase.day}/${cyclePhase.total} du cycle`} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: CYCLE_COLORS[cyclePhase.color].bg, borderRadius: radius.pill,
      padding: '5px 11px', fontSize: 12, fontWeight: 700,
      color: CYCLE_COLORS[cyclePhase.color].text, boxShadow: shadow.xs,
    }}>
      <i className={`ti ${cyclePhase.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
      <span>{cyclePhase.label}</span>
      <span style={{ opacity: 0.7, fontWeight: 500 }}>J{cyclePhase.day}/{cyclePhase.total}</span>
    </div>
  )

  const upcomingPhases = cyclePhase ? getUpcomingPhases(profile) : []
  const isInPeriod = cyclePhase && cyclePhase.phaseIndex === 0
  // Prédiction : règles dans ≤ 3 jours ?
  const periodSoon = (() => {
    if (!cyclePhase || isInPeriod) return null
    const nextPeriod = upcomingPhases.find((p) => p.label === 'Règles')
    if (nextPeriod && nextPeriod.startsIn <= 3) return nextPeriod.startsIn
    return null
  })()

  function handleLogPeriod() {
    const patch = logPeriodStart(profile)
    if (patch) {
      updateProfile(patch)
      toast(['no_period', 'menopause'].includes(profile.cycleMode) ? 'Saignement noté' : 'Début de règles enregistré', 'success')
    }
    setConfirmPeriod(false)
  }

  const cycleCard = cyclePhase && (
    <div className="anim-fadeInUp anim-d2" style={{
      background: CYCLE_COLORS[cyclePhase.color].bg, borderRadius: radius.lg,
      padding: wide ? 18 : isTablet ? 16 : 14, boxShadow: shadow.card,
    }}>
      {/* En-tête : phase actuelle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 999,
            background: alpha(CYCLE_COLORS[cyclePhase.color].accent, 13),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${cyclePhase.icon}`} style={{
              fontSize: 16, color: CYCLE_COLORS[cyclePhase.color].accent,
            }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: CYCLE_COLORS[cyclePhase.color].text }}>
              {cyclePhase.label}
            </div>
            <div style={{ fontSize: 12, color: CYCLE_COLORS[cyclePhase.color].text, opacity: 0.7 }}>
              Jour {cyclePhase.phaseDay} sur {cyclePhase.phaseTotal}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: CYCLE_COLORS[cyclePhase.color].text, opacity: 0.6,
        }}>
          J{cyclePhase.day}/{cyclePhase.total}
        </div>
      </div>

      {/* Roue de cycle SVG + phases à venir */}
      {(() => {
        const eff = getEffectivePhaseDurations(profile)
        const durations = [eff.periodDays, eff.follicularDays, eff.ovulationDays, eff.lutealDays]
        const phaseColors = [CYCLE_COLORS.pink.accent, CYCLE_COLORS.green.accent, CYCLE_COLORS.amber.accent, CYCLE_COLORS.sand.accent]
        const r = 38, cx = 50, cy = 50, stroke = 7
        let startAngle = -90 // commence en haut
        const arcs = durations.map((dur, i) => {
          const sweep = (dur / eff.cycleLen) * 360
          const a1 = (startAngle * Math.PI) / 180
          const a2 = ((startAngle + sweep) * Math.PI) / 180
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
          const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
          const large = sweep > 180 ? 1 : 0
          const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
          const arc = { d, color: phaseColors[i], startAngle }
          startAngle += sweep
          return arc
        })
        // Curseur position
        const cursorAngle = -90 + (cyclePhase.day / cyclePhase.total) * 360
        const cursorRad = (cursorAngle * Math.PI) / 180
        const cursorX = cx + r * Math.cos(cursorRad)
        const cursorY = cy + r * Math.sin(cursorRad)

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isInPeriod ? 0 : 12 }}>
            <svg viewBox="0 0 100 100" style={{ width: wide ? 90 : 76, height: wide ? 90 : 76, flexShrink: 0 }}>
              {arcs.map((arc, i) => (
                <path style={{ stroke: arc.color }} key={i} d={arc.d} fill="none"
                  strokeWidth={stroke} strokeLinecap="round"
                  opacity={cyclePhase.phaseIndex === i ? 1 : 0.35} />
              ))}
              <circle style={{ stroke: CYCLE_COLORS[cyclePhase.color].accent }} cx={cursorX} cy={cursorY} r={5.5} fill="#fff" strokeWidth={2.5} />
              <text style={{ fill: CYCLE_COLORS[cyclePhase.color].text }} x={cx} y={cy - 3} textAnchor="middle" fontSize="14" fontWeight="700">
                J{cyclePhase.day}
              </text>
              <text style={{ fill: CYCLE_COLORS[cyclePhase.color].text }} x={cx} y={cy + 10} textAnchor="middle" fontSize="9" opacity="0.6">
                /{cyclePhase.total}
              </text>
            </svg>
            {upcomingPhases.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {upcomingPhases.map((p, i) => (
                  <div key={i} style={{
                    background: alpha(colors.green.surface, 50), borderRadius: radius.sm,
                    padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <i className={`ti ${p.icon}`} style={{ fontSize: 14, color: CYCLE_COLORS[p.color]?.accent || colors.text.muted }} aria-hidden="true" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: CYCLE_COLORS[p.color]?.text || colors.text.body }}>
                        {p.label}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: colors.text.faint }}>
                      dans {p.startsIn}j
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Règles : début, abondance du jour, fin (voir components/CycleTracking) */}
      <PeriodTodayControls profile={profile} updateProfile={updateProfile} toast={toast} onStart={() => setConfirmPeriod(true)} />

    </div>
  )

  // Sans règles régulières ou ménopause : pas de phases, mais saignements à noter
  const bleedingCard = profile.cycleOn && (profile.gender === 'f' || profile.gender === 'n')
    && ['no_period', 'menopause'].includes(profile.cycleMode) && (
    <section aria-label="Suivi des saignements" style={{
      background: colors.pink.soft, borderRadius: radius.lg, padding: wide ? 18 : 14, boxShadow: shadow.card,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: type.base, fontWeight: 700, color: colors.pink.text, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-droplet" aria-hidden="true" /> {profile.cycleMode === 'menopause' ? 'Ménopause' : 'Sans règles régulières'}
      </div>
      <PeriodTodayControls profile={profile} updateProfile={updateProfile} toast={toast} onStart={() => setConfirmPeriod(true)} />
    </section>
  )

  const feelingCard = (
    <FeelingCard addCycleLog={addCycleLog} cycleLogs={cycleLogs} toast={toast} gender={profile.gender} wide={wide} ecouteSignal={ecouteSignal} />
  )

  const todayCard = loggedToday && (
    <div className="anim-fadeInUp anim-d3" style={{ background: colors.green.soft, borderRadius: radius.md, padding: wide ? 16 : 14, display: 'flex', gap: 9, alignItems: 'center', boxShadow: shadow.card }}>
      <i className="ti ti-check" style={{ color: colors.green.primaryDark, fontSize: 18 }} aria-hidden="true" />
      <span style={{ fontSize: type.base, color: colors.green.primaryDark }}>Tu as déjà pris soin de toi aujourd'hui.</span>
    </div>
  )

  // Suivi d'efficacité « en deux temps » : même règle que le badge de navigation
  // (voir needsEfficacyFollowUp dans stats.js). « Pas encore » repousse la
  // question de quelques heures sans la perdre.
  const pendingEfficacy = episodes.filter((e) => needsEfficacyFollowUp(e))
  const EFFICACY_ANSWERS = [
    { value: 'Bien', label: 'Oui, bien' },
    { value: 'Un peu', label: 'Un peu' },
    { value: 'Pas encore', label: 'Pas encore' },
  ]
  function whenTaken(iso) {
    const d = new Date(iso)
    const hh = d.getHours(), mm = d.getMinutes()
    const time = `${hh} h${mm ? ' ' + String(mm).padStart(2, '0') : ''}`
    const k = dayKey(d)
    if (k === today) return `aujourd'hui à ${time}`
    const y = new Date(); y.setDate(y.getDate() - 1)
    if (k === dayKey(y)) return `hier à ${time}`
    return `${d.toLocaleDateString('fr-FR', { weekday: 'long' })} à ${time}`
  }
  function answerEfficacy(ep, value) {
    if (value === 'Pas encore') {
      editEpisode(ep.id, { efficacy: 'Pas encore', efficacyAskedAt: new Date().toISOString() })
      toast('D\u2019accord, je te redemanderai un peu plus tard.', 'info')
    } else {
      editEpisode(ep.id, { efficacy: value, efficacyAskedAt: new Date().toISOString() })
      toast(`Efficacité notée : ${value.toLowerCase()}`, 'success')
    }
  }

  // Crises encore en cours (notées « en cours » depuis moins de 3 jours)
  const ongoingEpisodes = episodes.filter((e) => e.ongoing && Date.now() - new Date(e.createdAt).getTime() < 3 * 86400000)
  function endOngoing(ep) {
    const patch = endEpisodePatch(ep)
    editEpisode(ep.id, patch)
    toast(`Crise terminée : durée ${formatDuration(patch.durationMinutes)}`, 'success')
  }
  const ongoingCard = ongoingEpisodes.length > 0 && (
    <section aria-label="Crise en cours" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ongoingEpisodes.map((ep) => {
        const label = ep.customLabel || conditions[ep.condition]?.label || ep.condition
        const since = new Date(ep.createdAt)
        const sameDay = since.toDateString() === new Date().toDateString()
        const when = `${sameDay ? '' : since.toLocaleDateString('fr-FR', { weekday: 'long' }) + ' '}${since.getHours()} h ${String(since.getMinutes()).padStart(2, '0')}`
        return (
          <div key={ep.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, background: colors.danger.bg,
            border: `1.5px solid ${colors.danger.border}`, borderRadius: radius.lg, padding: '12px 12px 12px 16px',
          }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: colors.danger.text, flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <div style={{ flex: 1, minWidth: 0, fontSize: type.base, color: colors.text.body, lineHeight: 1.35 }}>
              <b style={{ color: colors.text.title }}>{label}</b> en cours depuis {when}
            </div>
            <button onClick={() => endOngoing(ep)}
              style={{
                minHeight: TOUCH_MIN, padding: '0 14px', borderRadius: radius.small, flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
                border: 'none', background: colors.green.primary, color: colors.onPrimary, fontSize: type.sm, fontWeight: 700,
              }}>
              C'est terminé
            </button>
          </div>
        )
      })}
    </section>
  )

  const efficacyCard = pendingEfficacy.length > 0 && (
    <section aria-labelledby="efficacy-title" className="anim-fadeInUp anim-d4" style={{
      background: colors.amber.bg, borderRadius: radius.lg, padding: wide ? 18 : 16,
      border: `1.5px solid ${colors.amber.border}`, boxShadow: shadow.card,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{
          width: 32, height: 32, borderRadius: radius.small, flexShrink: 0,
          background: alpha(colors.amber.border, 25), color: colors.amber.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-bell-ringing" style={{ fontSize: 18 }} />
        </span>
        <h2 id="efficacy-title" style={{ margin: 0, fontSize: type.md, fontWeight: 700, color: colors.amber.text }}>
          {pendingEfficacy.length === 1 ? 'Ton traitement a-t-il soulagé ?' : `${pendingEfficacy.length} traitements à évaluer`}
        </h2>
      </div>
      {pendingEfficacy.slice(0, 2).map((ep) => {
        const condLabel = conditions[ep.condition]?.label || ep.condition
        return (
          <div key={ep.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: type.base, color: colors.text.body, lineHeight: 1.45 }}>
              <b style={{ color: colors.text.title }}>{ep.treatment}</b> pour {condLabel.toLowerCase()}, pris {whenTaken(ep.createdAt)}.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {EFFICACY_ANSWERS.map((a) => (
                <button key={a.value} onClick={() => answerEfficacy(ep, a.value)}
                  style={{
                    minHeight: TOUCH_MIN, padding: '0 6px', borderRadius: radius.small,
                    border: `1.5px solid ${colors.amber.border}`,
                    background: a.value === 'Pas encore' ? 'transparent' : colors.green.surface,
                    color: colors.amber.text, fontSize: type.base, fontWeight: a.value === 'Pas encore' ? 600 : 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {pendingEfficacy.length > 2 && (
        <div style={{ fontSize: type.sm, color: colors.amber.text, textAlign: 'center' }}>
          Et {pendingEfficacy.length - 2} autre{pendingEfficacy.length - 2 > 1 ? 's' : ''} ensuite
        </div>
      )}
    </section>
  )

  const shortcutsBlock = shortcuts.length > 0 && (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: colors.text.faint, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <i className="ti ti-bolt" style={{ fontSize: 13 }} aria-hidden="true" /> Raccourcis
        <span style={{ opacity: 0.7 }}>{'· appui long pour supprimer'}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, paddingRight: 18,
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          {shortcuts.map((sc) => {
            const pressing = pressingShortcutId === sc.id
            return (
              <button key={sc.id}
                onClick={() => handleShortcutTap(sc)}
                onPointerDown={() => handleShortcutLongPressStart(sc)}
                onPointerUp={handleShortcutLongPressEnd}
                onPointerLeave={handleShortcutLongPressEnd}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
                  minHeight: TOUCH_MIN, padding: '0 16px', borderRadius: radius.small,
                  border: `1.5px solid ${colors.amber.border}`,
                  background: pressing ? colors.amber.text : colors.amber.bg,
                  color: pressing ? colors.amber.bg : colors.amber.text,
                  fontSize: type.base, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', userSelect: 'none',
                  transform: pressing ? 'scale(0.94)' : 'scale(1)',
                  transition: 'transform .2s ease, background .2s ease, color .2s ease',
                }}>
                <i className="ti ti-bolt" style={{ fontSize: 14 }} aria-hidden="true" />
                {sc.label}
              </button>
            )
          })}
        </div>
        {/* Fondu droit pour indiquer le scroll */}
        {shortcuts.length > 2 && (
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 4, width: wide ? 48 : 32,
            background: `linear-gradient(to right, transparent, ${colors.green.surface})`,
            pointerEvents: 'none', borderRadius: `0 ${radius.md} ${radius.md} 0`,
          }} />
        )}
      </div>
    </div>
  )

  // Actions de saisie : placées juste sous le jardin (la saisie doit rester ≤ 15 s)
  const actionsBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PrimaryButton icon="ti-plus" onClick={onLog} wide={wide}>Noter un épisode</PrimaryButton>
      <div style={{ display: 'grid', gridTemplateColumns: !loggedToday ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10 }}>
        {onQuickLog && (
          <button onClick={onQuickLog}
            style={{
              minHeight: TOUCH_MIN + 4, border: `1.5px solid ${colors.border.soft}`,
              background: colors.green.surface, color: colors.text.title, borderRadius: radius.lg,
              fontSize: type.base, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', fontFamily: 'inherit', padding: '0 10px',
            }}>
            <i className="ti ti-bolt" style={{ fontSize: 18, color: colors.amber.text }} aria-hidden="true" /> Noter vite
          </button>
        )}
        {!loggedToday && (
          <button onClick={handleAllGood}
            style={{
              minHeight: TOUCH_MIN + 4, border: `1.5px solid ${colors.green.leafLight}`,
              background: colors.green.soft, color: colors.green.primaryDark, borderRadius: radius.lg,
              fontSize: type.base, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', fontFamily: 'inherit', padding: '0 10px',
            }}>
            <i className="ti ti-sun" style={{ fontSize: 18 }} aria-hidden="true" /> Tout va bien
          </button>
        )}
      </div>
    </div>
  )

  const historyLink = (
    <button onClick={onSeeHistory}
      style={{
        width: '100%', minHeight: TOUCH_MIN, border: 'none', background: 'transparent',
        color: colors.green.primaryDark, borderRadius: radius.small,
        fontSize: type.base, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
      <i className="ti ti-chart-bar" aria-hidden="true" /> Voir mon historique
    </button>
  )

  const gardenProgressBlock = (
    <div style={{ margin: wide ? '14px 2px 20px' : isTablet ? '12px 2px 18px' : '10px 2px 16px' }}>
      {(gardenComplete || gardenDayCount === 0) ? (
        <div style={{ textAlign: 'center', fontSize: type.sm, color: colors.text.muted }}>{gardenProgressText}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 8, background: colors.green.softer, borderRadius: 999, overflow: 'hidden' }}>
              <div className="anim-barFillX" style={{
                width: `${Math.round((gardenDayCount / GARDEN_GOAL) * 100)}%`, height: '100%',
                background: colors.green.primary, borderRadius: 999,
              }} />
            </div>
            <div style={{ fontSize: type.sm, fontWeight: 700, color: colors.green.primaryDark, flexShrink: 0 }}>
              Jour <AnimatedNumber value={gardenDayCount} /> sur {GARDEN_GOAL}
            </div>
          </div>
          <div style={{ fontSize: type.sm, color: colors.text.muted, marginTop: 6 }}>
            Encore {GARDEN_GOAL - gardenDayCount} jour{GARDEN_GOAL - gardenDayCount > 1 ? 's' : ''} de suivi et ton jardin sera en fleurs
          </div>
        </>
      )}
    </div>
  )

  return (
    <Screen bp={bp} wide={wide}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: wide ? 24 : isTablet ? 20 : 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontSize: wide ? type.display : isTablet ? 30 : 28, fontWeight: 600, color: colors.text.title, letterSpacing: '-0.015em', lineHeight: 1.08 }}>
            {greeting}{userName ? `, ${userName}` : ''}
          </h1>
          <div style={{ fontSize: wide ? type.base : type.sm, color: colors.text.muted, marginTop: 4 }}>{todayLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {cyclePill}
          {(profile.completedGardens || 0) > 0 && (
            <StreakBadge icon="ti-trophy"><AnimatedNumber value={profile.completedGardens} /> récolte{profile.completedGardens > 1 ? 's' : ''}</StreakBadge>
          )}
          <StreakBadge><AnimatedNumber value={streak} /> j</StreakBadge>
        </div>
      </div>

      {gardenComplete && (
        <div className="anim-scaleIn" style={{
          background: colors.amber.bg, borderRadius: radius.lg,
          padding: '18px 16px', marginBottom: 14, textAlign: 'center',
          border: `1.5px solid ${colors.amber.border}`, boxShadow: shadow.sm,
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>
            <i className="ti ti-confetti" style={{ color: colors.amber.text, fontSize: 24 }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.amber.text, marginBottom: 4 }}>
            Ton jardin est en fleurs !
          </div>
          <div style={{ fontSize: 12, color: colors.amber.text, opacity: 0.8, marginBottom: 14 }}>
            {GARDEN_GOAL} jours de suivi, bravo pour ta régularité
          </div>
          <button onClick={() => setConfirmHarvest(true)}
            style={{
              border: 'none', background: colors.amber.text, color: colors.amber.bg,
              padding: '10px 22px', borderRadius: radius.md, fontSize: 14,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              boxShadow: shadow.button,
            }}>
            <i className="ti ti-plant" aria-hidden="true" /> Récolter et replanter
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmHarvest}
        title="Récolter ton jardin ?"
        message="Ton jardin actuel sera récolté et un nouveau cycle de 7 jours commencera. Cette action est irréversible."
        confirmLabel="Récolter"
        onConfirm={handleHarvest}
        onCancel={() => setConfirmHarvest(false)}
      />

      <ConfirmDialog
        open={confirmPeriod}
        title={['no_period', 'menopause'].includes(profile.cycleMode) ? 'Noter un saignement ?' : 'Début de règles ?'}
        message={['no_period', 'menopause'].includes(profile.cycleMode)
          ? 'Le saignement sera noté à partir d\u2019aujourd\u2019hui. Tu pourras le modifier dans ton profil.'
          : 'Ton cycle sera recalculé à partir d\u2019aujourd\u2019hui. Tu pourras modifier les dates dans ton profil si besoin.'}
        confirmLabel="Confirmer"
        onConfirm={handleLogPeriod}
        onCancel={() => setConfirmPeriod(false)}
      />

      {periodSoon != null && (
        <div className="anim-fadeInUp" style={{
          background: CYCLE_COLORS.pink.bg, borderRadius: radius.md,
          padding: '10px 14px', marginBottom: 14,
          border: `1px solid ${alpha(CYCLE_COLORS.pink.accent, 20)}`,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <i className="ti ti-droplet" style={{ fontSize: 16, color: CYCLE_COLORS.pink.accent }} aria-hidden="true" />
          <span style={{ fontSize: 12, color: CYCLE_COLORS.pink.text, fontWeight: 600 }}>
            {periodSoon === 1 ? 'Règles prévues demain' : `Règles prévues dans ${periodSoon} jours`}
          </span>
        </div>
      )}

      {(wide || isTablet) ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: wide ? '1.6fr 1fr' : '1.4fr 1fr', gap: wide ? 28 : 20, alignItems: 'start', marginBottom: wide ? 28 : 22 }}>
            <div>
              <div className="pousse-garden" style={{ borderRadius: radius.lg, overflow: 'hidden', boxShadow: shadow.md, aspectRatio: '300 / 190' }}>
                <GrowingGarden days={gardenDayCount} />
              </div>
              {gardenProgressBlock}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: wide ? 16 : 12 }}>
              {cycleCard}
              {bleedingCard}
              {efficacyCard}
              {feelingCard}
              {todayCard}
              {profile.moonOn && <PlanetaryWidget showMoon={profile.moonOn} />}
            </div>
          </div>
          {ongoingCard && <div style={{ marginBottom: 12 }}>{ongoingCard}</div>}
          {actionsBlock}
          <div style={{ marginTop: 14 }}>{shortcutsBlock}</div>
          {historyLink}
        </>
      ) : (
        <>
          <div className="pousse-garden" style={{
            borderRadius: radius.lg, overflow: 'hidden',
            marginBottom: 8, boxShadow: shadow.md,
            aspectRatio: '300 / 190',
          }}>
            <GrowingGarden days={gardenDayCount} />
          </div>
          {gardenProgressBlock}

          {ongoingCard && <div style={{ marginBottom: 12 }}>{ongoingCard}</div>}
          <div style={{ marginBottom: 16 }}>{actionsBlock}</div>
          {shortcutsBlock}

          {efficacyCard && <div style={{ marginBottom: 12 }}>{efficacyCard}</div>}
          <div style={{ marginBottom: 12 }}>{feelingCard}</div>
          {todayCard && <div style={{ marginBottom: 12 }}>{todayCard}</div>}
          {cycleCard && <div style={{ marginBottom: 12 }}>{cycleCard}</div>}
          {bleedingCard && <div style={{ marginBottom: 12 }}>{bleedingCard}</div>}

          {profile.moonOn && (
            <div style={{ marginBottom: 14 }}>
              <PlanetaryWidget showMoon={profile.moonOn} />
            </div>
          )}

          <div style={{ flex: 1 }} />
          {historyLink}
        </>
      )}

      {/* Mini-modal intensité pour raccourci */}
      {activeShortcut && (
        <Portal>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
        }} onClick={() => setActiveShortcut(null)} role="presentation">
          <div className="anim-slideUp" role="dialog" aria-modal="true" aria-label={activeShortcut.label} onClick={(e) => e.stopPropagation()} style={{
            background: colors.green.surface, borderRadius: `${radius.lg} ${radius.lg} 0 0`,
            padding: '24px 22px calc(28px + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: 420,
            boxShadow: shadow.xl,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.text.title, marginBottom: 4 }}>
              {activeShortcut.label}
            </div>
            <div style={{ fontSize: 12, color: colors.text.faint, marginBottom: 18 }}>
              Ajuste l'intensité puis enregistre
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: colors.text.muted }}>Intensité</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: colors.text.body }}>{shortcutIntensity}/10</span>
            </div>
            <input type="range" min={0} max={10} step={1} value={shortcutIntensity}
              aria-label="Intensité de l'épisode"
              onChange={(e) => setShortcutIntensity(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 18 }} />
            <div style={{ fontSize: 13, color: colors.text.muted, marginBottom: 8 }}>La crise est…</div>
            <div role="group" aria-label="État de la crise" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 20 }}>
              {[[true, 'Encore en cours'], [false, 'Déjà terminée']].map(([v, l]) => (
                <button key={l} type="button" aria-pressed={shortcutOngoing === v} onClick={() => setShortcutOngoing(v)}
                  style={{
                    minHeight: TOUCH_MIN, borderRadius: radius.small, cursor: 'pointer', fontFamily: 'inherit', fontSize: type.base,
                    border: `2px solid ${shortcutOngoing === v ? colors.green.primary : colors.border.soft}`,
                    background: shortcutOngoing === v ? colors.green.softer : colors.green.surface,
                    color: shortcutOngoing === v ? colors.text.title : colors.text.body, fontWeight: shortcutOngoing === v ? 700 : 500,
                  }}>{l}</button>
              ))}
            </div>
            <button onClick={handleShortcutSave} style={{
              width: '100%', border: 'none', background: colors.green.primary, color: colors.onPrimary,
              padding: 14, borderRadius: radius.lg, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', boxShadow: shadow.button,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <i className="ti ti-check" aria-hidden="true" /> Enregistrer
            </button>
          </div>
        </div>
        </Portal>
      )}

      {/* Confirmation suppression raccourci */}
      <ConfirmDialog
        open={!!confirmDeleteShortcut}
        title="Supprimer ce raccourci ?"
        message={confirmDeleteShortcut ? `Le raccourci "${confirmDeleteShortcut.label}" sera supprimé.` : ''}
        confirmLabel="Supprimer"
        danger
        onConfirm={() => {
          const sc = confirmDeleteShortcut
          removeShortcut(sc.id)
          setConfirmDeleteShortcut(null)
          toast('Raccourci supprimé', 'info', {
            duration: 5000,
            actionLabel: 'Annuler',
            action: () => { addShortcut(sc) },
          })
        }}
        onCancel={() => setConfirmDeleteShortcut(null)}
      />
    </Screen>
  )
}

// ---- « Comment je me sens » : ressenti du jour, une question à la fois ----
// Enregistré via addCycleLog (un seul ressenti par jour, écrasé si modifié).
// Visible pour tous les profils ; les libellés s'accordent au genre.
const FEELING_STEPS = ['Humeur', 'Énergie', 'Symptômes']

function FeelingChoice({ active, onClick, icon, children, multi }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        minHeight: TOUCH_MIN + 4, padding: '0 14px', borderRadius: radius.small,
        border: `1.5px solid ${active ? colors.green.primary : colors.border.soft}`,
        background: active ? colors.green.softer : colors.green.surface,
        color: active ? colors.text.title : colors.text.body,
        fontSize: type.base, fontWeight: active ? 700 : 500, fontFamily: 'inherit', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: multi ? 'center' : 'flex-start', gap: 8,
        transition: 'background .15s ease, border-color .15s ease',
      }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 18, color: active ? colors.green.primaryDark : colors.text.muted }} aria-hidden="true" />}
      {multi && active && <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

function FeelingCard({ addCycleLog, cycleLogs, toast, gender = 'f', wide, ecouteSignal = 0 }) {
  const today = dayKey(new Date())
  const todayLog = cycleLogs.find((l) => l.day === today) || null
  const g = genderKey(gender)
  const skipKey = `pousse.feeling.skip.${today}`
  const [skipped, setSkipped] = useState(() => { try { return !!sessionStorage.getItem(skipKey) } catch { return false } })
  const [editing, setEditing] = useState(false)
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState(todayLog?.mood || null)
  const [energy, setEnergy] = useState(todayLog?.energy || null)
  const [symptoms, setSymptoms] = useState(todayLog?.symptoms || [])
  const [freeSymptom, setFreeSymptom] = useState(todayLog?.freeSymptom || '')
  const FREE_SYMPTOM_MAX = 500
  const symptomList = FEELING_SYMPTOMS.filter((x) => !x.only || x.only.includes(g))
  const cardRef = useRef(null)

  // Ouverture depuis le rappel du soir : la carte réapparaît (même « passée »
  // plus tôt), vient à l'écran et reçoit le focus pour les lecteurs d'écran.
  useEffect(() => {
    if (!ecouteSignal) return
    try { sessionStorage.removeItem(skipKey) } catch { /* rien */ }
    setSkipped(false)
    const t = setTimeout(() => {
      const el = cardRef.current
      if (!el) return
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
      el.focus({ preventScroll: true })
    }, 350)
    return () => clearTimeout(t)
  }, [ecouteSignal])  // eslint-disable-line react-hooks/exhaustive-deps

  if (skipped && !todayLog) return null

  const cardStyle = {
    background: colors.green.surface, border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.lg, padding: wide ? 18 : 16, boxShadow: shadow.card,
    display: 'flex', flexDirection: 'column', gap: 12,
  }
  const title = { margin: 0, fontSize: type.md, fontWeight: 700, color: colors.text.title }

  // Ressenti déjà noté aujourd'hui : résumé + Modifier
  if (todayLog && !editing) {
    const parts = feelingParts(todayLog, g)
    return (
      <section ref={cardRef} tabIndex={-1} aria-labelledby="feeling-title" style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: 12, outline: 'none' }}>
        <i className="ti ti-mood-check" style={{ fontSize: 24, color: colors.green.primaryDark, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="feeling-title" style={{ ...title, fontSize: type.base }}>Ton ressenti du jour</h2>
          <div style={{ fontSize: type.base, color: colors.text.muted, marginTop: 2 }}>
            {parts.length ? parts.join(', ') : 'Noté'}
          </div>
          <div style={{ fontSize: type.xs, color: colors.text.soft, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-history" aria-hidden="true" /> Retrouve tes ressentis dans l'historique et le rapport.
          </div>
        </div>
        <button onClick={() => { setEditing(true); setStep(0) }}
          style={{
            minHeight: TOUCH_MIN, padding: '0 14px', borderRadius: radius.small, flexShrink: 0,
            border: `1.5px solid ${colors.border.soft}`, background: 'transparent',
            color: colors.green.primaryDark, fontSize: type.base, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          }}>
          Modifier
        </button>
      </section>
    )
  }

  function next() { setStep((n) => Math.min(n + 1, FEELING_STEPS.length - 1)) }
  function save() {
    addCycleLog({ mood, energy, symptoms, freeSymptom: freeSymptom.trim() || undefined })
    setEditing(false)
    toast('Ressenti enregistré', 'success')
  }
  function skipToday() {
    try { sessionStorage.setItem(skipKey, '1') } catch { /* rien */ }
    setSkipped(true)
  }

  return (
    <section ref={cardRef} tabIndex={-1} aria-labelledby="feeling-title" style={{ ...cardStyle, outline: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 id="feeling-title" style={title}>Comment te sens-tu aujourd'hui ?</h2>
        <div role="img" aria-label={`Question ${step + 1} sur ${FEELING_STEPS.length}`} style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {FEELING_STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i <= step ? colors.green.primary : colors.border.soft,
              transition: 'width .25s ease, background .25s ease',
            }} />
          ))}
        </div>
      </div>

      <div key={step} className="anim-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.muted }}>{FEELING_STEPS[step]}</div>
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {FEELING_MOODS.map((m) => (
              <FeelingChoice key={m.key} icon={m.icon} active={mood === m.key}
                onClick={() => { setMood(m.key); next() }}>{m[g]}</FeelingChoice>
            ))}
          </div>
        )}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {FEELING_ENERGY.map((e) => (
              <FeelingChoice key={e.key} icon={e.icon} active={energy === e.key}
                onClick={() => { setEnergy(e.key); next() }}>{e.label}</FeelingChoice>
            ))}
          </div>
        )}
        {step === 2 && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {symptomList.map((x) => {
                const active = symptoms.includes(x.key)
                return (
                  <FeelingChoice key={x.key} multi active={active}
                    onClick={() => setSymptoms((p) => active ? p.filter((k) => k !== x.key) : [...p, x.key])}>
                    {x.label}
                  </FeelingChoice>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: type.sm, color: colors.text.muted }}>Autre chose ? (facultatif)</label>
              <textarea
                value={freeSymptom}
                onChange={(e) => setFreeSymptom(e.target.value.slice(0, FREE_SYMPTOM_MAX))}
                placeholder="Décris tes symptômes avec tes mots…"
                rows={2}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: type.base,
                  borderRadius: radius.small, border: `1.5px solid ${colors.border.soft}`,
                  background: colors.green.surface, color: colors.text.body,
                  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.4,
                }}
              />
              {freeSymptom.length > 0 && (
                <div style={{ fontSize: type.xs, color: colors.text.faint, textAlign: 'right' }}>
                  {freeSymptom.length}/{FREE_SYMPTOM_MAX}
                </div>
              )}
            </div>
            <PrimaryButton icon="ti-check" onClick={save} wide={wide}>
              {symptoms.length || freeSymptom.trim() ? 'Enregistrer mon ressenti' : 'Aucun symptôme, enregistrer'}
            </PrimaryButton>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {step > 0 ? (
          <button onClick={() => setStep((n) => n - 1)} style={linkBtn}>
            <i className="ti ti-chevron-left" aria-hidden="true" /> Retour
          </button>
        ) : <span />}
        {step < 2 ? (
          <button onClick={next} style={linkBtn}>Passer</button>
        ) : null}
        {step === 0 && !todayLog && (
          <button onClick={skipToday} style={{ ...linkBtn, color: colors.text.muted }}>Pas aujourd'hui</button>
        )}
      </div>
    </section>
  )
}

const linkBtn = {
  minHeight: TOUCH_MIN, padding: '0 8px', border: 'none', background: 'transparent',
  color: colors.green.primaryDark, fontSize: type.base, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
}
