import { useState } from 'react'
import { colors, radius, shadow, font, type, TOUCH_MIN } from '../theme/tokens'
import { Screen, ScreenHeader, StreakBadge, Segmented, AnimatedNumber, useToast } from '../components/ui'
import PlanetaryWidget from '../components/PlanetaryWidget'
import { useStore } from '../data/store'
import { currentStreak, dayKey, getCyclePhase, CYCLE_PHASES } from '../data/storage'
import { computeStats, buildSeries, buildDaySeries, filterByPeriod, periodLabel, withoutBienetre, formatHour, getRefDate, buildCalendarGrid } from '../data/stats'
import { conditions, zoneLabels } from '../data/conditions'
import { genderKey, feelingParts, feelingsInPeriod, feelingForDay, summarizeFeelings, dayLabel } from '../data/feelings'
import { getMoonPhase, getMoonPhaseName } from '../data/astro'
import { formatDuration } from '../data/episodeTime'
import { loggedPeriodDays, predictedPeriodDays, fertileDays, FLOW_LEVELS } from '../data/cycle'
import { getEffectivePhaseDurations } from '../data/storage'

const BAR_COLOR = {
  calm: colors.green.leaf,
  light: colors.amber.bar,
  strong: colors.coral.barStrong,
  empty: colors.green.leafFaint,
}

const CYCLE_BAR_COLORS = {
  pink: '#D4537E', green: '#5A8262', amber: '#E9B85E', sand: '#C4B17C',
}

function BarChart({ bars, labels, height = 96, wide = false, isTablet = false, moonPhases = null, cyclePhases = null }) {
  const hasMoon = moonPhases && moonPhases.length === bars.length
  const hasCycle = cyclePhases && cyclePhases.length === bars.length
  const extraH = (hasMoon ? 14 : 0) + (hasCycle ? 10 : 0)
  const totalH = height + extraH
  const vw = wide ? 520 : isTablet ? 440 : 320
  const max = Math.max(...bars.map((b) => b.v), 1)
  const gap = bars.length <= 7 ? 6 : 3
  const bw = Math.floor((vw - (bars.length - 1) * gap) / bars.length)
  const floorY = height - 22
  return (
    <svg viewBox={`0 0 ${vw} ${totalH}`} style={{ width: '100%' }} role="img" aria-label="Historique des épisodes" preserveAspectRatio="xMidYMid meet">
      <line style={{ stroke: colors.green.leafFaint }} x1="0" y1={floorY} x2={vw} y2={floorY} strokeWidth="1" />
      {bars.map((b, i) => {
        const h = b.v === 0 ? 4 : Math.round(8 + (b.v / max) * (floorY - 18))
        const x = i * (bw + gap)
        const fill = b.v === 0 ? BAR_COLOR.empty : BAR_COLOR[b.c]
        return (
          <g key={i}>
            <rect x={x} y={floorY - h} width={bw} height={h} rx={bw > 10 ? 5 : 3}
              style={{ fill: fill, transformOrigin: `${x + bw / 2}px ${floorY}px`, animation: `barGrow .5s cubic-bezier(.34,1.56,.64,1) ${i * 0.06}s both` }} />
            {labels[i] !== undefined && (
              <text x={x + bw / 2} y={height - 5} textAnchor="middle" fontSize={wide ? '12' : isTablet ? '11' : '9'} style={{ fill: colors.text.soft }} fontFamily="Nunito Variable, Nunito, sans-serif">
                {labels[i]}
              </text>
            )}
          </g>
        )
      })}
      {hasCycle && bars.map((_, i) => {
        const x = i * (bw + gap)
        const y = height + (hasMoon ? 14 : 0) + 2
        const phaseColor = cyclePhases[i] ? CYCLE_BAR_COLORS[cyclePhases[i]] || '#ccc' : 'transparent'
        return (
          <rect style={{ fill: phaseColor }} key={`cycle-${i}`} x={x} y={y} width={bw} height={6} rx={3} opacity={cyclePhases[i] ? 0.5 : 0.15} />
        )
      })}
      {hasMoon && bars.map((_, i) => {
        const x = i * (bw + gap) + bw / 2
        const y = height + 7
        const phase = moonPhases[i]
        const luminosity = phase <= 0.5 ? phase * 2 : (1 - phase) * 2
        const fillColor = luminosity > 0.5 ? '#C4B17C' : '#5A6B5E'
        const opacity = 0.3 + luminosity * 0.4
        return (
          <circle style={{ fill: fillColor }} key={`moon-${i}`} cx={x} cy={y} r={3} opacity={opacity} />
        )
      })}
    </svg>
  )
}

function LegendDot({ color, children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      {children}
    </span>
  )
}

const INTENSITY_COLOR = (v) => v <= 4 ? colors.green.leaf : v <= 7 ? colors.amber.bar : colors.coral.barStrong

// Heatmap annuelle type GitHub contributions
function YearHeatmap({ episodes, year, wide, isTablet, showMoon = false }) {
  // Construire un map jour → intensité max
  const byDay = {}
  episodes.forEach((e) => {
    const d = new Date(e.createdAt)
    if (d.getFullYear() !== year) return
    const k = dayKey(d)
    const prev = byDay[k] || 0
    byDay[k] = Math.max(prev, e.intensity || 1)
  })

  // Grille : 53 colonnes (semaines) × 7 lignes (jours)
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const startDow = (jan1.getDay() + 6) % 7 // lundi=0
  const totalDays = Math.ceil((dec31 - jan1) / 86400000) + 1

  const cellSize = wide ? 13 : isTablet ? 11 : 9
  const gap = wide ? 3 : 2
  const weeks = []
  let week = Array(startDow).fill(null)

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(year, 0, 1 + d)
    const k = dayKey(date)
    const today = dayKey(new Date())
    const moonP = showMoon ? getMoonPhase(date) : null
    const moonMarker = moonP != null ? (moonP < 0.04 || moonP > 0.96 ? 'new' : (moonP > 0.46 && moonP < 0.54) ? 'full' : null) : null
    week.push({ key: k, intensity: byDay[k] || 0, isToday: k === today, month: date.getMonth(), moonMarker })
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const colorFor = (v) => {
    if (v === 0) return colors.green.leafFaint
    if (v <= 3) return colors.green.leaf
    if (v <= 6) return colors.amber.bar
    return colors.coral.barStrong
  }

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  // Calculer la position x de chaque mois
  const monthPositions = []
  let lastMonth = -1
  weeks.forEach((w, wi) => {
    const first = w.find((c) => c != null)
    if (first && first.month !== lastMonth) {
      monthPositions.push({ label: monthLabels[first.month], x: wi * (cellSize + gap) })
      lastMonth = first.month
    }
  })

  const svgW = weeks.length * (cellSize + gap)
  const svgH = 7 * (cellSize + gap) + 16

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: wide ? '100%' : svgW, maxWidth: '100%', display: 'block' }}>
        {/* Mois labels */}
        {monthPositions.map((m, i) => (
          <text style={{ fill: colors.text.faint }} key={i} x={m.x + 2} y={10} fontSize={9}>{m.label}</text>
        ))}
        {/* Cellules */}
        {weeks.map((w, wi) => w.map((cell, di) => {
          if (!cell) return null
          return (
            <rect style={{ fill: colorFor(cell.intensity), stroke: cell.isToday ? colors.green.primary : 'none' }} key={`${wi}-${di}`}
              x={wi * (cellSize + gap)} y={di * (cellSize + gap) + 16}
              width={cellSize} height={cellSize} rx={2}
              strokeWidth={cell.isToday ? 1.5 : 0}
              opacity={cell.intensity > 0 ? 1 : 0.5}
            >
              <title>{cell.key}{cell.intensity > 0 ? ` — intensité ${cell.intensity}` : ''}{cell.moonMarker === 'full' ? ' · pleine lune' : cell.moonMarker === 'new' ? ' · nouvelle lune' : ''}</title>
            </rect>
          )
        }
        ))}
        {/* Moon markers */}
        {showMoon && weeks.map((w, wi) => w.map((cell, di) => {
          if (!cell || !cell.moonMarker) return null
          const x = wi * (cellSize + gap) + cellSize - 2
          const y = di * (cellSize + gap) + 16 + 2
          return (
            <circle style={{ fill: cell.moonMarker === 'full' ? '#C4B17C' : '#5A6B5E', stroke: cell.moonMarker === 'full' ? '#E9B85E' : '#8A9B8E' }} key={`m-${wi}-${di}`} cx={x} cy={y} r={1.8}
              strokeWidth={0.5}
            />
          )
        }))}
      </svg>
    </div>
  )
}

const PAGE_SIZE = 20


// Calendrier de chaleur du mois : une case par jour, couleur = intensité max.
// Distingue « journée calme notée » et « pas de saisie » (pointillés).
// Toucher un jour ouvre la vue Jour (où l'on peut modifier ou supprimer).
const HEAT_LEVELS = {
  none: { bg: 'transparent', fg: colors.text.muted, border: `1.5px dashed ${colors.heat.none}`, label: 'pas de saisie' },
  calm: { bg: colors.heat.calm, fg: colors.heat.calmText, border: 'none', label: 'journée calme' },
  light: { bg: colors.heat.light, fg: colors.heat.lightText, border: 'none', label: 'épisode léger' },
  moderate: { bg: colors.heat.moderate, fg: colors.heat.moderateText, border: 'none', label: 'épisode modéré' },
  strong: { bg: colors.heat.strong, fg: colors.heat.strongText, border: 'none', label: 'épisode fort' },
}
function heatLevel(cellEpisodes) {
  if (cellEpisodes.length === 0) return 'none'
  const real = cellEpisodes.filter((e) => e.condition !== 'bienetre')
  if (real.length === 0) return 'calm'
  const max = Math.max(...real.map((e) => e.intensity || 0))
  if (max <= 4) return 'light'
  if (max <= 7) return 'moderate'
  return 'strong'
}

function MonthCalendar({ episodes, refDate, onPickDay, cyclePhases, wide, feelingDays, cycleMarks }) {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const { weeks, monthLabel } = buildCalendarGrid(episodes, year, month)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const cellH = wide ? 52 : TOUCH_MIN
  const dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div role="grid" aria-label={`Calendrier de ${monthLabel}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div role="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {dows.map((d, i) => (
          <div role="columnheader" key={i} style={{ textAlign: 'center', fontSize: type.xs, fontWeight: 700, color: colors.text.muted }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div role="row" key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {week.map((cell, di) => {
            if (!cell.day) return <div role="gridcell" key={di} style={{ height: cellH }} />
            const t = new Date(year, month, cell.day).getTime()
            const future = t > todayStart
            const lvl = future ? null : heatLevel(cell.episodes)
            const h = lvl ? HEAT_LEVELS[lvl] : null
            const phaseColor = cyclePhases ? cyclePhases[cell.day - 1] : null
            const dk = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
            const hasFeeling = !future && feelingDays && feelingDays.has(dk)
            // Cycle : règles notées, règles prévues, fenêtre de fertilité (indicative)
            const flow = cycleMarks?.logged.get(dk)
            const predicted = !flow && cycleMarks?.predicted.has(dk)
            const fertile = cycleMarks?.fertile.has(dk)
            const flowTxt = flow ? `, règles notées${flow !== 'note' ? ` (${FLOW_LEVELS.find((f) => f.v === flow)?.label.toLowerCase()})` : ''}` : ''
            const aria = `${cell.day} ${monthLabel.split(' ')[0]}${future ? ', à venir' : `, ${h.label}`}${hasFeeling ? ', ressenti noté' : ''}${flowTxt}${predicted ? ', règles prévues' : ''}${fertile ? ', fenêtre de fertilité estimée' : ''}${cell.isToday ? ", aujourd'hui" : ''}`
            return (
              <div role="gridcell" key={di}>
                <button onClick={future ? undefined : () => onPickDay(cell.day)} disabled={future} aria-label={aria}
                  style={{
                    position: 'relative', width: '100%', height: cellH, padding: 0,
                    borderRadius: radius.small, fontFamily: 'inherit',
                    border: h ? h.border : 'none',
                    background: h ? h.bg : 'transparent',
                    color: future ? colors.text.soft : h.fg,
                    fontSize: type.base, fontWeight: cell.isToday ? 800 : 600,
                    boxShadow: cell.isToday ? `inset 0 0 0 2px ${colors.green.primary}` : 'none',
                    cursor: future ? 'default' : 'pointer', opacity: future && !predicted && !fertile ? 0.6 : 1,
                    outline: predicted ? `2px dashed ${colors.pink.border}` : 'none', outlineOffset: -4,
                  }}>
                  {cell.day}
                  {flow && (
                    <i className="ti ti-droplet-filled" aria-hidden="true" style={{
                      position: 'absolute', top: 3, left: 3, fontSize: 11, color: colors.pink.border,
                    }} />
                  )}
                  {fertile && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', bottom: 4, left: 4, width: 6, height: 6, borderRadius: '50%',
                      background: '#4E9A86', boxShadow: `0 0 0 1.5px ${colors.green.surface}`,
                    }} />
                  )}
                  {hasFeeling && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%',
                      background: colors.green.primaryDark, boxShadow: `0 0 0 1.5px ${colors.green.surface}`,
                    }} />
                  )}
                  {phaseColor && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', left: '25%', right: '25%', bottom: 4, height: 3, borderRadius: 2,
                      background: CYCLE_BAR_COLORS[phaseColor] || 'transparent', opacity: 0.8,
                    }} />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ---- Ressentis (« Comment te sens-tu aujourd'hui ? ») dans l'historique ----
function FeelingChips({ log, g }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {feelingParts(log, g).map((p) => (
        <span key={p} style={{
          fontSize: type.sm, fontWeight: 600, color: colors.text.body, background: colors.green.surface,
          border: `1px solid ${colors.border.soft}`, borderRadius: radius.small, padding: '4px 10px',
        }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
      ))}
    </div>
  )
}

// Vue Jour : le ressenti noté ce jour-là
function DayFeeling({ log, g }) {
  return (
    <section aria-label="Ressenti du jour" style={{
      background: colors.green.soft, borderRadius: radius.lg, padding: '12px 14px', marginBottom: 12,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: type.sm, fontWeight: 700, color: colors.green.primaryDark }}>
        <i className="ti ti-mood-check" style={{ fontSize: 18 }} aria-hidden="true" /> Ressenti du jour
      </div>
      {log ? <FeelingChips log={log} g={g} /> : (
        <div style={{ fontSize: type.sm, color: colors.text.muted }}>Aucun ressenti noté ce jour-là.</div>
      )}
    </section>
  )
}

// Semaine / mois / année : synthèse + liste des jours (un jour touché ouvre la vue Jour)
function PeriodFeelings({ list, g, onOpenDay, wide }) {
  const [showAll, setShowAll] = useState(false)
  if (list.length === 0) return null
  const sum = summarizeFeelings(list, g)
  const recent = [...list].reverse()
  const shown = showAll ? recent : recent.slice(0, 5)
  const facts = [
    `${sum.days} jour${sum.days > 1 ? 's' : ''} noté${sum.days > 1 ? 's' : ''}`,
    sum.topMood && `humeur la plus fréquente : ${sum.topMood.label.toLowerCase()} (${sum.topMood.count} j)`,
    sum.lowEnergyDays > 0 && `énergie basse ${sum.lowEnergyDays} j`,
    sum.topSymptom && `${sum.topSymptom.label.toLowerCase()} ${sum.topSymptom.count} j`,
  ].filter(Boolean)
  return (
    <section aria-labelledby="period-feelings-title" className="anim-fadeInUp anim-d4" style={{
      marginTop: 12, background: colors.green.surface, border: `1px solid ${colors.border.soft}`,
      borderRadius: radius.lg, padding: wide ? 16 : 14, boxShadow: shadow.card,
    }}>
      <h2 id="period-feelings-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: type.md, fontWeight: 700, color: colors.text.title }}>
        <i className="ti ti-mood-check" style={{ fontSize: 20, color: colors.green.primaryDark }} aria-hidden="true" /> Mes ressentis
      </h2>
      <p style={{ margin: '6px 0 10px', fontSize: type.sm, color: colors.text.muted, lineHeight: 1.5 }}>
        {facts.join(', ')}.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((l) => (
          <li key={l.day}>
            <button onClick={() => onOpenDay(l.day)}
              style={{
                width: '100%', minHeight: TOUCH_MIN, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                border: 'none', background: colors.green.soft, borderRadius: radius.small, padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
              <span style={{ fontSize: type.sm, fontWeight: 700, color: colors.text.title, minWidth: 92, flexShrink: 0 }}>
                {dayLabel(l.day, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span style={{ flex: 1, fontSize: type.sm, color: colors.text.body }}>{feelingParts(l, g).join(', ')}</span>
              <i className="ti ti-chevron-right" style={{ color: colors.text.soft }} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {recent.length > 5 && (
        <button onClick={() => setShowAll(!showAll)}
          style={{ marginTop: 6, minHeight: TOUCH_MIN, border: 'none', background: 'transparent', color: colors.green.primaryDark, fontSize: type.sm, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {showAll ? 'Afficher moins' : `Voir les ${recent.length} jours`}
        </button>
      )}
    </section>
  )
}

function EpisodeList({ episodes, showMoon, wide, isTablet, onEdit, onDelete }) {
  const [expandedId, setExpandedId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  if (episodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 10px' }}>
        <i className="ti ti-calendar-event" style={{ fontSize: 30, color: colors.green.leafLight }} aria-hidden="true" />
        <p style={{ fontSize: 13, color: colors.text.muted, marginTop: 10 }}>Aucun épisode sur cette période</p>
      </div>
    )
  }
  const visible = episodes.slice(0, visibleCount)
  const hasMore = episodes.length > visibleCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: wide ? 10 : 8 }}>
      {visible.map((ep, i) => {
        const condLabel = conditions[ep.condition]?.label || ep.condition
        const hour = ep.hour || formatHour(ep.createdAt)
        const d = new Date(ep.createdAt)
        const moonInfo = showMoon ? getMoonPhaseName(d) : null
        const expanded = expandedId === ep.id
        return (
          <div key={ep.id} className={`anim-fadeInUp anim-d${Math.min(i + 1, 8)}`}
            role="button" tabIndex={0} aria-expanded={expanded}
            aria-label={`${condLabel}, ${hour}, intensité ${ep.intensity} sur 10`}
            onClick={() => setExpandedId(expanded ? null : ep.id)}
            onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedId(expanded ? null : ep.id) } }}
            style={{
              background: expanded ? colors.green.soft : colors.sand.bg,
              borderRadius: radius.md, padding: wide ? '13px 16px' : isTablet ? '12px 14px' : '10px 12px', cursor: 'pointer',
              border: expanded ? `1.5px solid ${colors.green.leafLight}` : '1.5px solid transparent',
              transition: 'background .2s, border-color .2s, box-shadow .2s',
              boxShadow: expanded ? shadow.sm : shadow.card,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: wide ? 14 : 10 }}>
              <span style={{ fontSize: wide ? 14 : 13, fontWeight: 600, color: colors.text.muted, minWidth: wide ? 50 : 42 }}>{hour}</span>
              <span style={{ width: wide ? 10 : 8, height: wide ? 10 : 8, borderRadius: '50%', background: INTENSITY_COLOR(ep.intensity || 0), flexShrink: 0 }} />
              <span style={{ fontSize: wide ? 14 : 13, color: colors.text.body, flex: 1 }}>{condLabel}</span>
              <span style={{ fontSize: wide ? 13 : 12, color: colors.text.soft }}>{ep.intensity || 0}/10</span>
              {ep.ongoing ? <span style={{ fontSize: 12, fontWeight: 700, color: colors.danger.text }}>en cours</span>
                : (ep.durationMinutes != null || ep.duration) && <span style={{ fontSize: 12, color: colors.text.faint }}>{ep.durationMinutes != null ? formatDuration(ep.durationMinutes) : ep.duration}</span>}
              <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: colors.text.faint }} aria-hidden="true" />
            </div>
            {moonInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 52 }}>
                <span style={{
                  fontSize: 12, padding: '2px 7px', borderRadius: 5,
                  background: colors.sand.bg, color: colors.sand.text,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-moon" style={{ fontSize: 12 }} aria-hidden="true" />
                  {moonInfo.label}
                </span>
              </div>
            )}
            {expanded && (
              <div className="anim-slideDown" onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${colors.border.soft}` }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: colors.text.muted, marginBottom: 8 }}>
                  {ep.zones?.length > 0 && (
                    <span><b>Zones :</b> {ep.zones.map((z) => zoneLabels[z] || z).join(', ')}</span>
                  )}
                  {ep.treatment && ep.treatment !== 'Aucun' && (
                    <span><b>Traitement :</b> {ep.treatment}{ep.treatmentDose ? `, ${ep.treatmentDose}` : ''}{ep.treatmentAt ? `, pris à ${((d) => `${new Date(d).getHours()} h ${String(new Date(d).getMinutes()).padStart(2, '0')}`)(ep.treatmentAt)}` : ''}{ep.efficacy ? ` (${ep.efficacy})` : ''}</span>
                  )}
                  {ep.triggers?.length > 0 && (
                    <span><b>Déclencheurs :</b> {ep.triggers.join(', ')}</span>
                  )}
                </div>
                {ep.extra?.length > 0 && (
                  <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 8 }}>
                    <b>Détails :</b> {ep.extra.join(', ')}
                  </div>
                )}
                {ep.endedAt && (
                  <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 8 }}>
                    <b>Horaires :</b> de {((d) => `${new Date(d).getHours()} h ${String(new Date(d).getMinutes()).padStart(2, '0')}`)(ep.createdAt)} à {((d) => `${new Date(d).getHours()} h ${String(new Date(d).getMinutes()).padStart(2, '0')}`)(ep.endedAt)}
                  </div>
                )}
                {ep.note && (
                  <div style={{ fontSize: 13, color: colors.text.body, marginBottom: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: colors.green.soft, borderRadius: radius.small, padding: '8px 10px' }}>
                    <b>Note :</b> {ep.note}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {onEdit && (
                    <button onClick={() => onEdit(ep.id)}
                      style={{
                        border: `1.5px solid ${colors.green.primary}`, background: colors.green.surface,
                        color: colors.green.primaryDark, padding: '0 16px', minHeight: TOUCH_MIN, borderRadius: radius.small, fontSize: type.base, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                      }}>
                      <i className="ti ti-pencil" style={{ fontSize: 16 }} aria-hidden="true" /> Modifier
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(ep.id)}
                      style={{
                        border: `1px solid ${colors.danger.border}`, background: colors.danger.bg,
                        color: colors.danger.text, padding: '0 16px', minHeight: TOUCH_MIN, borderRadius: radius.small, fontSize: type.base, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                      }}>
                      <i className="ti ti-trash" style={{ fontSize: 16 }} aria-hidden="true" /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
      {hasMore && (
        <button onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          style={{
            border: `1.5px solid ${colors.border.soft}`, background: colors.green.surface,
            color: colors.text.muted, padding: '10px 0', borderRadius: radius.md,
            fontSize: 13, fontFamily: 'inherit', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 4,
          }}>
          <i className="ti ti-chevron-down" style={{ fontSize: 14 }} aria-hidden="true" />
          Voir plus ({episodes.length - visibleCount} restant{episodes.length - visibleCount > 1 ? 's' : ''})
        </button>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, delta, deltaGood, wide, isTablet }) {
  return (
    <div className="anim-fadeInUp" style={{ flex: 1, background: colors.sand.bg, borderRadius: radius.md, padding: wide ? 18 : isTablet ? 16 : 14, minHeight: wide ? 80 : isTablet ? 74 : 68, boxShadow: shadow.card }}>
      <div style={{ fontSize: wide ? 13 : isTablet ? 12 : 12, color: colors.sand.text }}>{label}</div>
      <div style={{ fontFamily: font.display, fontSize: wide ? 28 : isTablet ? 26 : 23, fontWeight: 600, lineHeight: 1.2, color: colors.text.body }}>
        <AnimatedNumber value={value} />{suffix && value !== '\u2014' && <span style={{ fontFamily: font.family, fontSize: wide ? 14 : 12, fontWeight: 400, color: colors.sand.faint }}> {suffix}</span>}
      </div>
      {delta && (
        <div style={{ fontSize: 12, fontWeight: 600, color: deltaGood ? colors.green.primaryDark : colors.sand.faint, marginTop: 1 }}>
          {delta}
        </div>
      )}
    </div>
  )
}

function NavBtn({ icon, onClick, label, disabled }) {
  return (
    <button onClick={onClick} aria-label={label} disabled={disabled}
      style={{
        border: 'none', background: colors.green.soft, borderRadius: radius.small,
        width: TOUCH_MIN, height: TOUCH_MIN, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
        color: colors.green.primaryDark, fontSize: 16,
      }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
    </button>
  )
}

export default function Dashboard({ onLog, onEditEpisode, bp = 'mobile' }) {
  const { episodes, profile, removeEpisode, addEpisode, cycleLogs } = useStore()
  const toast = useToast()
  const [view, setView] = useState('s')
  const [offset, setOffset] = useState(0)
  const wide = bp === 'desktop'
  const isTablet = bp === 'tablet'

  const real = withoutBienetre(episodes)
  const streak = currentStreak(episodes)
  const filtered = filterByPeriod(real, view, offset)
  const g = genderKey(profile.gender)
  const periodFeelings = view !== 'j' ? feelingsInPeriod(cycleLogs, view, offset) : []
  const dayFeeling = view === 'j' ? feelingForDay(cycleLogs, dayKey(getRefDate('j', offset))) : null
  const feelingDays = new Set((cycleLogs || []).map((l) => l.day))
  const cycleMarks = (() => {
    if (view !== 'm' || !profile.cycleOn || !(profile.gender === 'f' || profile.gender === 'n')) return null
    const ref = getRefDate('m', offset)
    const from = dayKey(new Date(ref.getFullYear(), ref.getMonth(), 1))
    const to = dayKey(new Date(ref.getFullYear(), ref.getMonth() + 1, 0))
    const eff = getEffectivePhaseDurations(profile)
    const m = {
      logged: loggedPeriodDays(profile, from, to),
      predicted: predictedPeriodDays(profile, from, to, eff.cycleLen, eff.periodDays),
      fertile: fertileDays(profile, from, to, eff.cycleLen),
    }
    return m.logged.size || m.predicted.size || m.fertile.size ? m : null
  })()
  // Comparaison avec la période précédente (affichée hors vue jour)
  const prevCount = view !== 'j' ? filterByPeriod(real, view, offset - 1).length : null
  // Jours calmes : jours de la période sans aucun épisode
  const calmDays = (() => {
    if (view !== 's') return null
    const total = 7
    const activeDays = new Set(filtered.map((e) => dayKey(e.createdAt)))
    return total - Math.min(activeDays.size, total)
  })()
  const stats = computeStats(filtered)
  const series = view !== 'j' ? buildSeries(real, view, offset) : null

  // Compute moon phases for week view bars
  const weekMoonPhases = (view === 's' && profile.moonOn) ? (() => {
    const ref = getRefDate('s', offset)
    const dow = (ref.getDay() + 6) % 7
    const monday = new Date(ref)
    monday.setDate(ref.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      d.setHours(12, 0, 0, 0)
      return getMoonPhase(d)
    })
  })() : null

  // Cycle phases for week view bars
  const weekCyclePhases = ((view === 's' || view === 'm') && profile.cycleOn && profile.gender !== 'h') ? (() => {
    const ref = getRefDate(view, offset)
    if (view === 's') {
      const dow = (ref.getDay() + 6) % 7
      const monday = new Date(ref)
      monday.setDate(ref.getDate() - dow)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const phase = getCyclePhase(profile, d)
        return phase ? phase.color : null
      })
    }
    // Month: ~30 days
    const year = ref.getFullYear(), month = ref.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      const phase = getCyclePhase(profile, d)
      return phase ? phase.color : null
    })
  })() : null
  const dayEpisodes = view === 'j' ? buildDaySeries(real, offset) : []
  const pLabel = periodLabel(view, offset)

  function handleViewChange(v) {
    setView(v)
    setOffset(0)
  }

  // Liste des ressentis → vue Jour
  function openDayKey(dk) {
    const [y, m, d] = dk.split('-').map(Number)
    const now = new Date()
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    setView('j')
    setOffset(Math.round((new Date(y, m - 1, d) - today0) / 86400000))
  }

  // Calendrier du mois → vue Jour sur la date touchée
  function openDay(day) {
    const ref = getRefDate('m', offset)
    const now = new Date()
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(ref.getFullYear(), ref.getMonth(), day)
    setView('j')
    setOffset(Math.round((target - today0) / 86400000))
  }

  if (real.length === 0) {
    return (
      <Screen bp={bp}>
        <ScreenHeader title="Mon historique" bp={bp} />
        <div className="anim-fadeInUp" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div className="anim-popIn" style={{ marginBottom: 16 }}>
            <i className="ti ti-chart-dots-3" style={{ fontSize: 44, color: colors.green.leafLight }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.text.title, marginBottom: 8 }}>
            Ton historique est vide
          </div>
          <p style={{ fontSize: 13, color: colors.text.muted, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 20px' }}>
            Note ton premier épisode pour voir apparaître tes statistiques et tes tendances.
          </p>
          <button onClick={onLog}
            style={{
              border: 'none', background: colors.green.primary, color: colors.onPrimary,
              padding: '12px 24px', borderRadius: radius.lg, fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: shadow.button,
            }}>
            <i className="ti ti-plus" aria-hidden="true" /> Noter un épisode
          </button>
        </div>
      </Screen>
    )
  }

  const chartBlock = (
    <>
      <Segmented
        options={[{ value: 'j', label: 'Jour' }, { value: 's', label: 'Semaine' }, { value: 'm', label: 'Mois' }, { value: 'a', label: 'Année' }]}
        value={view} onChange={handleViewChange} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: wide ? 10 : 6, marginBottom: wide ? 18 : 14 }}>
        <NavBtn icon="ti-chevron-left" onClick={() => setOffset((o) => o - 1)} label="Période précédente" />
        <button onClick={() => setOffset(0)}
          style={{
            border: 'none', background: offset === 0 ? colors.green.soft : colors.green.softer,
            borderRadius: radius.small, padding: '0 16px', minHeight: TOUCH_MIN, fontSize: type.sm, fontWeight: 700,
            color: colors.green.primaryDark, cursor: 'pointer', fontFamily: 'inherit',
            minWidth: 140, textAlign: 'center',
          }}>
          {pLabel}
        </button>
        <NavBtn icon="ti-chevron-right" onClick={() => setOffset((o) => Math.min(o + 1, 0))} label="Période suivante" disabled={offset >= 0} />
      </div>

      {view === 'j' ? (
        <>
        <DayFeeling log={dayFeeling} g={g} />
        <EpisodeList episodes={dayEpisodes} showMoon={profile.moonOn} wide={wide} isTablet={isTablet} onEdit={onEditEpisode} onDelete={(id) => {
          const ep = episodes.find((e) => e.id === id)
          removeEpisode(id)
          toast('Épisode supprimé', 'info', {
            duration: 5000,
            actionLabel: 'Annuler',
            action: () => { if (ep) addEpisode(ep) },
          })
        }} />
        </>
      ) : view === 'm' ? (
        <>
          <MonthCalendar episodes={episodes} refDate={getRefDate('m', offset)} onPickDay={openDay}
            cyclePhases={weekCyclePhases} wide={wide} feelingDays={feelingDays} cycleMarks={cycleMarks} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', fontSize: type.sm, color: colors.text.body, margin: '14px 0 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: colors.green.primaryDark }} />
              Ressenti noté
            </span>
            {cycleMarks?.logged.size > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-droplet-filled" aria-hidden="true" style={{ color: colors.pink.border }} /> Règles notées
              </span>
            )}
            {cycleMarks?.predicted.size > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 4, border: `2px dashed ${colors.pink.border}`, boxSizing: 'border-box' }} /> Règles prévues
              </span>
            )}
            {cycleMarks?.fertile.size > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4E9A86' }} /> Fertilité (indicative)
              </span>
            )}
            {['calm', 'light', 'moderate', 'strong', 'none'].map((k) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 4, background: HEAT_LEVELS[k].bg, border: HEAT_LEVELS[k].border, boxSizing: 'border-box' }} />
                {HEAT_LEVELS[k].label.charAt(0).toUpperCase() + HEAT_LEVELS[k].label.slice(1)}
              </span>
            ))}
          </div>
          {weekCyclePhases && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: type.xs, color: colors.text.muted, marginTop: 8, flexWrap: 'wrap' }}>
              <LegendDot color={CYCLE_BAR_COLORS.pink}>règles</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.green}>folliculaire</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.amber}>ovulation</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.sand}>lutéale</LegendDot>
            </div>
          )}
          <p style={{ textAlign: 'center', fontSize: type.sm, color: colors.text.muted, margin: '10px 0 0' }}>
            Touche un jour pour voir ou modifier ses épisodes.
          </p>
        </>
      ) : view === 'a' ? (
        <>
          <YearHeatmap episodes={real} year={getRefDate('a', offset).getFullYear()} wide={wide} isTablet={isTablet} showMoon={profile.moonOn} />
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', fontSize: type.sm, color: colors.text.body, margin: '8px 0 0', flexWrap: 'wrap' }}>
            <LegendDot color={colors.green.leafFaint}>aucun</LegendDot>
            <LegendDot color={colors.green.leaf}>léger</LegendDot>
            <LegendDot color={colors.amber.bar}>modéré</LegendDot>
            <LegendDot color={colors.coral.barStrong}>fort</LegendDot>
          </div>
        </>
      ) : (
        <>
          <BarChart bars={series.bars} labels={series.labels} height={wide ? 180 : isTablet ? 150 : 100} wide={wide} isTablet={isTablet} moonPhases={weekMoonPhases} cyclePhases={weekCyclePhases} />
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', fontSize: type.sm, color: colors.text.body, margin: '6px 0 0', flexWrap: 'wrap' }}>
            <LegendDot color={colors.green.leaf}>jour calme</LegendDot>
            <LegendDot color={colors.amber.bar}>épisode léger</LegendDot>
            <LegendDot color={colors.coral.barStrong}>épisode fort</LegendDot>
          </div>
          {weekCyclePhases && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 12, color: colors.text.faint, marginTop: 4 }}>
              <LegendDot color={CYCLE_BAR_COLORS.pink}>règles</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.green}>folliculaire</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.amber}>ovulation</LegendDot>
              <LegendDot color={CYCLE_BAR_COLORS.sand}>lutéale</LegendDot>
            </div>
          )}
        </>
      )}
    </>
  )

  const statsBlock = (
    <>
      <div style={{ display: 'flex', gap: wide ? 12 : isTablet ? 10 : 8, marginBottom: wide ? 16 : isTablet ? 14 : 12 }}>
        <StatCard label="Épisodes" value={String(stats.count)} wide={wide} isTablet={isTablet}
          delta={prevCount != null ? (stats.count === prevCount ? 'stable' : `${stats.count < prevCount ? '−' : '+'}${Math.abs(stats.count - prevCount)} vs période passée`) : null}
          deltaGood={prevCount != null && stats.count <= prevCount} />
        <StatCard label="Intensité moy." value={stats.avgIntensity} suffix="/10" wide={wide} isTablet={isTablet} />
        {calmDays != null && <StatCard label="Jours calmes" value={String(calmDays)} suffix="sur 7" deltaGood wide={wide} isTablet={isTablet} />}
      </div>
      {stats.topTriggers.length > 0 && (
        <div className="anim-fadeInUp anim-d3" style={{ background: colors.green.soft, borderRadius: radius.md, padding: wide ? '14px 18px' : '12px 14px', display: 'flex', gap: 9, alignItems: 'flex-start', boxShadow: shadow.card }}>
          <i className="ti ti-bulb" style={{ color: colors.green.primaryDark, fontSize: wide ? 19 : 17, marginTop: 1 }} aria-hidden="true" />
          <span style={{ fontSize: wide ? 14 : isTablet ? 13 : 12, color: colors.green.primaryDark, lineHeight: 1.5 }}>
            Ton déclencheur le plus fréquent : {stats.topTriggers[0].label} ({stats.topTriggers[0].count} fois).
          </span>
        </div>
      )}
      <PeriodFeelings list={periodFeelings} g={g} onOpenDay={openDayKey} wide={wide} />
    </>
  )

  return (
    <Screen bp={bp} wide={wide}>
      <ScreenHeader title="Mon historique" right={<StreakBadge><AnimatedNumber value={streak} /> j</StreakBadge>} bp={bp} />
      {(wide || isTablet) ? (
        <div style={{ display: 'grid', gridTemplateColumns: wide ? '1.8fr 1fr' : '1.4fr 1fr', gap: wide ? 32 : 22, alignItems: 'start' }}>
          <div>{chartBlock}</div>
          <div>
            {statsBlock}
            {profile.moonOn && (
              <div style={{ marginTop: 14 }}><PlanetaryWidget showMoon={profile.moonOn} /></div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>{chartBlock}</div>
          {statsBlock}
          {(profile.moonOn || profile.planetsOn) && (
            <div style={{ marginTop: 14 }}><PlanetaryWidget compact showMoon={profile.moonOn} showPlanets={profile.planetsOn} /></div>
          )}
        </>
      )}
      <div style={{ flex: 1 }} />
    </Screen>
  )
}
