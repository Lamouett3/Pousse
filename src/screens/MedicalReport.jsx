import { useState } from 'react'
import { colors, radius, font, alpha } from '../theme/tokens'
import { PrimaryButton, Segmented, AnimatedNumber } from '../components/ui'

import { useStore } from '../data/store'
import { computeStats, withoutBienetre, filterByPeriod, periodLabel, getRefDate, formatHour } from '../data/stats'
import { formatDuration } from '../data/episodeTime'
import { CYCLE_MODES, normalizePeriods, cycleStats, periodLength, maxFlow, FLOW_LEVELS, menstrualAnalysis, daysBetween, parseDay } from '../data/cycle'
import { lifestyleForReport, sortedWeights, latestWeight, formatKg, bmi, treatmentsForReport } from '../data/lifestyle'
import { genderKey, feelingsInPeriod, summarizeFeelings, moodLabel, energyLabel, symptomLabel, dayLabel } from '../data/feelings'
import { conditions, zoneLabels } from '../data/conditions'
import { getCyclePhase, dayKey } from '../data/storage'
import { getMoonPhase, getMoonPhaseName, MOON_PHASES_8, getMoonPhaseIndex } from '../data/astro'

// =====================================================================
// Rapport médical structuré — conçu pour être imprimé et remis à un
// professionnel de santé. Registre clinique sobre (cf. CLAUDE.md §3).
// =====================================================================

export default function MedicalReport({ bp = 'mobile' }) {
  const { episodes: allEpisodes, profile, cycleLogs } = useStore()
  const allReal = withoutBienetre(allEpisodes)
  const [period, setPeriod] = useState('m')
  const [offset, setOffset] = useState(0)
  const showAstro = profile.moonOn
  const [astroIncluded, setAstroIncluded] = useState(false)
  const [patientNotes, setPatientNotes] = useState('')

  const filtered = filterByPeriod(allReal, period, offset)
  const stats = computeStats(filtered)
  const cardW = bp === 'desktop' ? 780 : bp === 'tablet' ? 680 : undefined
  const pLabel = periodLabel(period, offset)
  const g = genderKey(profile.gender)
  const feelings = feelingsInPeriod(cycleLogs, period, offset)

  function handlePeriodChange(p) { setPeriod(p); setOffset(0) }
  const handleExport = () => window.print()

  if (allReal.length === 0) {
    return (
      <div style={{ background: colors.clinical.bg, borderRadius: radius.lg, padding: 24, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: cardW, background: colors.clinical.surface, borderRadius: radius.md, padding: 30, fontFamily: font.family, border: `0.5px solid ${colors.clinical.border}`, textAlign: 'center' }}>
          <i className="ti ti-file-text" style={{ fontSize: 36, color: colors.sand.faint }} aria-hidden="true" />
          <p style={{ fontSize: 14, color: colors.text.muted, marginTop: 14, lineHeight: 1.6 }}>
            Le rapport se génère automatiquement à partir de tes épisodes. Note quelques épisodes pour le remplir.
          </p>
        </div>
      </div>
    )
  }

  const now = new Date()
  const sorted = [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  // --- Données structurées ---
  const byDate = groupByDate(sorted)
  const byCondition = groupByCondition(sorted)
  const intensityDist = computeIntensityDistribution(sorted)
  const zoneBreakdown = computeZoneBreakdown(sorted)
  const timeBreakdown = computeTimeBreakdown(sorted)
  const conditionBreakdown = computeConditionBreakdown(sorted)
  const avgPerDay = computeAvgPerDay(sorted)
  const maxIntDay = computeMaxIntensityDay(sorted)
  const evolution = computeEvolution(sorted)
  const completeness = computeCompleteness(sorted, period, offset)

  // R2 : Points clés auto-générés
  const keyInsights = (() => {
    const points = []
    if (conditionBreakdown.length > 0) {
      const top = conditionBreakdown[0]
      const pct = Math.round((top.count / filtered.length) * 100)
      points.push(`${top.label} représente ${pct}% des épisodes (${top.count}/${filtered.length})`)
    }
    if (stats.topTriggers.length > 0) {
      points.push(`Déclencheur principal identifié : ${stats.topTriggers[0].label} (${stats.topTriggers[0].count} occurrences)`)
    }
    if (evolution) {
      if (evolution.trend === 'down') points.push("Tendance à l'amélioration sur la période")
      else if (evolution.trend === 'up') points.push("Tendance à l'aggravation sur la période")
    }
    const evaluatedTreatments = stats.treatments.filter((t) => t.evaluated > 0)
    if (evaluatedTreatments.length > 0) {
      const best = [...evaluatedTreatments].sort((a, b) => (b.relieved / b.evaluated) - (a.relieved / a.evaluated))[0]
      const rate = Math.round((best.relieved / best.evaluated) * 100)
      points.push(`Traitement le plus efficace : ${best.name} (${rate}% de soulagement)`)
    }
    return points
  })()

  // R3 : bornes de période pour mini-timeline
  const periodStart = sorted.length > 0 ? new Date(sorted[0].createdAt).getTime() : 0
  const periodEnd = sorted.length > 0 ? new Date(sorted[sorted.length - 1].createdAt).getTime() : 0
  const periodSpan = periodEnd - periodStart || 1

  // R6 : pic horaire
  const peakHour = (() => {
    const maxCount = Math.max(...timeBreakdown.map((t) => t.count))
    const peak = timeBreakdown.find((t) => t.count === maxCount)
    return peak && maxCount > 0 ? { slot: peak.slot, count: maxCount } : null
  })()

  return (
    <div style={{ background: colors.clinical.bg, borderRadius: radius.lg, padding: bp === 'mobile' ? 12 : 24, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }} className="report-wrap">
      <div className="report-card" style={{
        width: '100%', maxWidth: cardW, background: colors.clinical.surface, borderRadius: radius.md,
        padding: bp === 'mobile' ? '22px 16px' : '32px 28px', fontFamily: font.family, border: `0.5px solid ${colors.clinical.border}`,
      }}>

        {/* ============ CONTROLES (ne s'impriment pas) ============ */}
        <div className="no-print" style={{ marginBottom: 20 }}>
          <Segmented variant="clinical"
            options={[{ value: 'j', label: 'Jour' }, { value: 's', label: 'Semaine' }, { value: 'm', label: 'Mois' }, { value: 'a', label: 'Année' }]}
            value={period} onChange={handlePeriodChange} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <NavBtn icon="ti-chevron-left" onClick={() => setOffset((o) => o - 1)} label="Période précédente" />
            <button onClick={() => setOffset(0)}
              style={{
                border: 'none', background: offset === 0 ? colors.clinical.surfaceSoft : colors.clinical.bg,
                borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                color: colors.clinical.ink, cursor: 'pointer', fontFamily: 'inherit',
                minWidth: 140, textAlign: 'center',
              }}>
              {pLabel}
            </button>
            <NavBtn icon="ti-chevron-right" onClick={() => setOffset((o) => Math.min(o + 1, 0))} label="Période suivante" disabled={offset >= 0} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', marginBottom: 18 }}>
            <i className="ti ti-calendar-off" style={{ fontSize: 28, color: colors.sand.faint }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: colors.text.muted, marginTop: 8 }}>Aucun épisode sur cette période.</p>
            {feelings.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: 18 }}>
                <FeelingsReport list={feelings} g={g} period={period} offset={offset} title="Ressenti déclaré par le patient" />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ============ 1. EN-TÊTE DU RAPPORT ============ */}
            <div style={{ borderBottom: `2px solid ${colors.clinical.ink}`, paddingBottom: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: colors.clinical.ink, letterSpacing: '-0.3px' }}>
                Rapport de suivi symptomatologique
              </div>
              <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
                Période : {pLabel}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 10 }}>
                <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Profil</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink }}>
                    {profile.gender === 'f' ? 'Femme' : profile.gender === 'h' ? 'Homme' : 'Non précisé'}
                    {profile.birthYear ? `, ${new Date().getFullYear() - profile.birthYear} ans` : ''}
                  </div>
                </div>
                {(() => {
                  // Mesures : taille, dernier poids, IMC (chiffre seul), évolution sur la période
                  const last = latestWeight(profile)
                  if (!profile.heightCm && !last) return null
                  const inPeriod = filterByPeriod(sortedWeights(profile).map((w) => ({ ...w, createdAt: `${w.date}T12:00:00` })), period, offset)
                  const imc = last ? bmi(profile.heightCm, last.kg) : null
                  return (
                    <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Mesures</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink }}>
                        {[profile.heightCm && `${profile.heightCm} cm`, last && formatKg(last.kg), imc && `IMC ${String(imc).replace('.', ',')}`].filter(Boolean).join(', ')}
                      </div>
                      {last && (
                        <div style={{ fontSize: 12, color: colors.text.soft }}>
                          {inPeriod.length >= 2
                            ? `Sur la période : ${formatKg(inPeriod[0].kg)} → ${formatKg(inPeriod[inPeriod.length - 1].kg)}`
                            : `Poids mesuré le ${new Date(`${last.date}T12:00:00`).toLocaleDateString('fr-FR')}`}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {treatmentsForReport(profile).length > 0 && (
                  <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Traitements habituels</div>
                    {treatmentsForReport(profile).map((t) => (
                      <div key={t} style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink }}>{t}</div>
                    ))}
                  </div>
                )}
                {lifestyleForReport(profile).length > 0 && (
                  <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Mode de vie</div>
                    {lifestyleForReport(profile).map((l) => (
                      <div key={l.label} style={{ fontSize: 12, color: colors.clinical.ink }}>
                        {l.label} : <b style={{ fontWeight: 600 }}>{l.value.toLowerCase()}</b>
                      </div>
                    ))}
                  </div>
                )}
                {profile.cycleOn && profile.gender !== 'h' && (
                  <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Cycle</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink }}>
                      {profile.cycleMode === 'pill' ? `Pilule (${profile.pillActiveDays || 21}+${profile.pillBreakDays || 7}j)` : profile.cycleMode === 'endo' ? `Endométriose (${profile.cycleLength || 35}j)` : `Naturel (${profile.cycleLength || 28}j)`}
                    </div>
                  </div>
                )}
                <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>Pathologies suivies</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink }}>
                    {conditionBreakdown.map((c) => c.label).join(', ')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: colors.sand.faint, marginTop: 6 }}>
                Généré le {fmtDate(now)} à {fmtTime(now)} — Application Pousse
              </div>
            </div>

            {/* ============ 2. SYNTHÈSE CLINIQUE ============ */}
            <Section title="1. Synthèse clinique" icon="ti-report-médical">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${bp === 'mobile' ? '80px' : '100px'}, 1fr))`, gap: 8, marginBottom: 14 }}>
                <KeyStat value={String(stats.count)} label="épisodes totaux" />
                <KeyStat value={stats.avgIntensity} suffix="/10" label="intensité moyenne" />
                <KeyStat value={avgPerDay} label="épisodes/jour" />
                <KeyStat value={completeness.pct} label="jours de suivi" />
                <KeyStat value={String(conditionBreakdown.length)} label={conditionBreakdown.length > 1 ? 'pathologies' : 'pathologie'} />
              </div>

              {evolution && (
                <div style={{
                  background: evolution.trend === 'down' ? colors.green.softer : evolution.trend === 'up' ? colors.danger.bg : colors.clinical.surfaceSoft,
                  borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12,
                  border: `1px solid ${evolution.trend === 'down' ? colors.green.leafLight : evolution.trend === 'up' ? colors.danger.border : colors.clinical.bg}`,
                  color: evolution.trend === 'down' ? colors.green.primaryDark : evolution.trend === 'up' ? colors.danger.text : colors.text.muted,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <i className={`ti ${evolution.trend === 'down' ? 'ti-trending-down' : evolution.trend === 'up' ? 'ti-trending-up' : 'ti-minus'}`} style={{ fontSize: 16 }} aria-hidden="true" />
                  {evolution.text}
                </div>
              )}

              {maxIntDay.value !== '—' && (
                <div style={{ fontSize: 12, color: colors.text.muted, marginBottom: 14 }}>
                  Pic d'intensité : <b style={{ color: colors.clinical.ink }}>{maxIntDay.value}/10</b> le {maxIntDay.date}
                  {maxIntDay.condition && <> ({maxIntDay.condition})</>}
                </div>
              )}

              {/* Points clés (R2) */}
              {keyInsights.length > 0 && (
                <div style={{
                  background: colors.clinical.surfaceSoft, borderRadius: 8, padding: '14px 16px',
                  marginBottom: 14, borderLeft: `3px solid ${colors.green.primary}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.clinical.ink, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-bulb" style={{ fontSize: 14, color: colors.green.primary }} aria-hidden="true" />
                    Points clés
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {keyInsights.map((insight, i) => (
                      <li key={i} style={{ fontSize: 12, color: colors.text.body, lineHeight: 1.8 }}>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Distribution d'intensité */}
              <SubTitle>Répartition des intensités</SubTitle>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 44, marginBottom: 4 }}>
                {intensityDist.map((d, i) => (
                  <div key={d.level} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="anim-barGrow" style={{
                      width: '100%', maxWidth: 28, borderRadius: 3,
                      height: d.count > 0 ? Math.max(4, d.pct * 0.4) : 0,
                      background: d.level <= 3 ? colors.green.leaf : d.level <= 6 ? colors.amber.bar : d.level <= 8 ? colors.coral.barStrong : '#C45050',
                      animationDelay: `${i * 0.04}s`,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                {intensityDist.map((d) => (
                  <div key={d.level} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.text.faint }}>
                    {d.level}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: 12, color: colors.text.faint }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.green.leaf, flexShrink: 0 }} /> 0–3 Légère
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.amber.bar, flexShrink: 0 }} /> 4–6 Modérée
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colors.coral.barStrong, flexShrink: 0 }} /> 7–8 Forte
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#C45050', flexShrink: 0 }} /> 9–10 Sévère
                </span>
              </div>

              {/* Repartition horaire */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <SubTitle>Répartition horaire</SubTitle>
                {peakHour && <span style={{ fontSize: 12, color: colors.text.faint }}>Pic : {peakHour.slot} ({peakHour.count} épisode{peakHour.count > 1 ? 's' : ''})</span>}
              </div>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 30, marginBottom: 4 }}>
                {timeBreakdown.map((t, i) => {
                  const maxC = Math.max(1, ...timeBreakdown.map((s) => s.count))
                  return (
                    <div key={t.slot} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%', maxWidth: 16, borderRadius: 2,
                        height: t.count > 0 ? Math.max(3, (t.count / maxC) * 26) : 0,
                        background: colors.green.primary, opacity: 0.65,
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 1, marginBottom: 6 }}>
                {timeBreakdown.map((t, i) => (
                  <div key={t.slot} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: colors.text.faint }}>
                    {i % 4 === 0 ? t.slot : ''}
                  </div>
                ))}
              </div>
            </Section>

            {/* ============ 3. JOURNAL CHRONOLOGIQUE ============ */}
            <Section title="2. Journal chronologique" icon="ti-calendar">
              {byDate.map(({ dateStr, fullDate, episodes: dayEps }) => (
                <div key={dateStr} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: colors.clinical.ink,
                    background: colors.clinical.surfaceSoft, padding: '6px 10px',
                    borderRadius: 6, marginBottom: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>{fullDate}</span>
                    <span style={{ fontSize: 12, fontWeight: 400, color: colors.text.soft }}>
                      {dayEps.length} épisode{dayEps.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayEps.map((ep) => {
                      const condLabel = conditions[ep.condition]?.label || ep.customLabel || ep.condition
                      const epZones = (ep.zones || []).map((z) => zoneLabels[z] || z)
                      const epTriggers = ep.triggers || []
                      const intensity = ep.intensity || 0
                      const borderColor = intensity <= 3 ? colors.green.leaf : intensity <= 6 ? colors.amber.bar : intensity <= 8 ? colors.coral.barStrong : '#C45050'
                      return (
                        <div key={ep.id} style={{
                          background: colors.clinical.surfaceSoft, borderRadius: 8,
                          padding: '10px 14px', borderLeft: `3px solid ${borderColor}`,
                        }}>
                          {/* Ligne 1 : heure, pathologie, intensité, durée */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: epZones.length > 0 || epTriggers.length > 0 ? 6 : 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: colors.text.muted, minWidth: 42 }}>
                              {formatHour(ep.createdAt)}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: colors.clinical.ink }}>{condLabel}</span>
                            <IntensityBadge value={intensity} />
                            {(ep.ongoing || ep.durationMinutes != null || ep.duration) && <span style={{ fontSize: 12, color: colors.text.soft, marginLeft: 'auto' }}>{ep.ongoing ? 'en cours' : ep.durationMinutes != null ? formatDuration(ep.durationMinutes) : ep.duration}</span>}
                          </div>
                          {/* Ligne 2 : zones et déclencheurs en chips */}
                          {(epZones.length > 0 || epTriggers.length > 0) && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: (ep.treatment && ep.treatment !== 'Aucun') || (ep.extra?.length > 0) ? 6 : 0 }}>
                              {epZones.map((z) => (
                                <span key={z} style={{
                                  fontSize: 12, padding: '2px 7px', borderRadius: 4,
                                  background: colors.clinical.bg, color: colors.text.body,
                                }}>
                                  <i className="ti ti-map-pin" style={{ fontSize: 12 }} aria-hidden="true" /> {z}
                                </span>
                              ))}
                              {epTriggers.map((t) => (
                                <span key={t} style={{
                                  fontSize: 12, padding: '2px 7px', borderRadius: 4,
                                  background: colors.amber.bg, color: colors.amber.text,
                                }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Ligne 3 : traitement + efficacité */}
                          {ep.treatment && ep.treatment !== 'Aucun' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <i className="ti ti-pill" style={{ fontSize: 12, color: colors.text.soft }} aria-hidden="true" />
                              <span style={{ color: colors.text.body, fontWeight: 600 }}>{ep.treatment}</span>
                              {(ep.treatmentDose || ep.treatmentAt) && (
                                <span style={{ fontSize: 12, color: colors.text.muted }}>
                                  {[ep.treatmentDose, ep.treatmentAt && `à ${((d) => `${new Date(d).getHours()} h ${String(new Date(d).getMinutes()).padStart(2, '0')}`)(ep.treatmentAt)}`].filter(Boolean).join(' ')}
                                </span>
                              )}
                              {ep.efficacy && ep.efficacy !== 'Pas encore' ? (
                                <span style={{ fontSize: 12, color: ep.efficacy === 'Bien' ? colors.green.primaryDark : colors.amber.text }}>
                                  — {ep.efficacy}
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: colors.text.faint, fontStyle: 'italic' }}>— en attente</span>
                              )}
                            </div>
                          )}
                          {/* Note libre du patient */}
                          {ep.note && (
                            <div style={{ fontSize: 12, color: colors.text.body, marginTop: 4, fontStyle: 'italic', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                              « {ep.note} »
                            </div>
                          )}
                          {/* Ligne 4 : extras */}
                          {ep.extra?.length > 0 && (
                            <div style={{ fontSize: 12, color: colors.text.muted, marginTop: 4 }}>
                              {ep.extra.join(', ')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </Section>

            {/* ============ 4. ANALYSE PAR PATHOLOGIE ============ */}
            {conditionBreakdown.length > 0 && (
              <Section title="3. Analyse par pathologie" icon="ti-stethoscope">
                {byCondition.map(({ key, label, episodes: condEps }) => {
                  const condStats = computeStats(condEps)
                  const condZones = computeZoneBreakdown(condEps)
                  const intensities = condEps.map((e) => e.intensity || 0)
                  const minI = Math.min(...intensities)
                  const maxI = Math.max(...intensities)

                  return (
                    <div key={key} style={{
                      border: `1px solid ${colors.clinical.bg}`, borderRadius: 8,
                      padding: '14px 14px 10px', marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.clinical.ink, marginBottom: 8 }}>
                        {label}
                        <span style={{ fontSize: 12, fontWeight: 400, color: colors.text.soft, marginLeft: 8 }}>
                          {condEps.length} episode{condEps.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${bp === 'mobile' ? '75px' : '90px'}, 1fr))`, gap: 6, marginBottom: 10 }}>
                        <MiniStat label="Intensité moy." value={condStats.avgIntensity} suffix="/10" />
                        <MiniStat label="Plage" value={`${minI}–${maxI}`} suffix="/10" />
                        {condZones.length > 0 && <MiniStat label="Zone principale" value={condZones[0].label} />}
                      </div>

                      {/* Mini-timeline (R3) */}
                      {condEps.length >= 2 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.soft, marginBottom: 4 }}>Chronologie</div>
                          <div style={{ position: 'relative', height: 22, background: colors.clinical.bg, borderRadius: 4, overflow: 'hidden' }}>
                            {condEps.map((ep) => {
                              const t = new Date(ep.createdAt).getTime()
                              const pct = Math.max(2, Math.min(98, ((t - periodStart) / periodSpan) * 100))
                              const eInt = ep.intensity || 0
                              const dotColor = eInt <= 3 ? colors.green.leaf : eInt <= 6 ? colors.amber.bar : eInt <= 8 ? colors.coral.barStrong : '#C45050'
                              return (
                                <div key={ep.id} style={{
                                  position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                                  width: 8, height: 8, borderRadius: '50%', background: dotColor,
                                  border: '1.5px solid rgba(255,255,255,0.9)',
                                }} />
                              )
                            })}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.text.faint, marginTop: 2 }}>
                            <span>{fmtShortDate(new Date(sorted[0].createdAt))}</span>
                            <span>{fmtShortDate(new Date(sorted[sorted.length - 1].createdAt))}</span>
                          </div>
                        </div>
                      )}

                      {/* Déclencheurs pour cette pathologie */}
                      {condStats.topTriggers.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.soft, marginBottom: 4 }}>Déclencheurs identifiés</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {condStats.topTriggers.map((t) => (
                              <span key={t.label} style={{
                                fontSize: 12, padding: '3px 8px', borderRadius: 6,
                                background: colors.clinical.surfaceSoft, color: colors.text.body,
                                border: `1px solid ${colors.clinical.bg}`,
                              }}>
                                {t.label} <b>({t.count})</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Durées pour cette pathologie */}
                      {(() => {
                        const durations = computeDurationBreakdown(condEps)
                        return durations.length > 0 ? (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.soft, marginBottom: 4 }}>Durées</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {durations.map((d) => (
                                <span key={d.duration} style={{
                                  fontSize: 12, padding: '3px 8px', borderRadius: 6,
                                  background: colors.clinical.surfaceSoft, color: colors.text.body,
                                  border: `1px solid ${colors.clinical.bg}`,
                                }}>
                                  {d.duration} <b>({d.count})</b>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null
                      })()}

                      {/* Traitements pour cette pathologie */}
                      {condStats.treatments.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.soft, marginBottom: 4 }}>Traitements</div>
                          {condStats.treatments.map((t) => {
                            const rate = t.evaluated > 0 ? Math.round((t.relieved / t.evaluated) * 100) : 0
                            return (
                              <div key={t.name} style={{ fontSize: 12, color: colors.text.body, marginBottom: 2 }}>
                                {t.name} — {t.taken} prise{t.taken > 1 ? 's' : ''}, soulagement {t.relieved}/{t.evaluated}
                                {' '}
                                <EfficacyTag rate={rate} />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </Section>
            )}

            {/* ============ 5. CORRELATIONS ============ */}
            <Section title="4. Corrélations et facteurs" icon="ti-chart-dots-3">
              {/* Zones corporelles */}
              {zoneBreakdown.length > 0 && (
                <>
                  <SubTitle>Zones corporelles touchées</SubTitle>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                    {zoneBreakdown.map((z) => {
                      const pct = Math.round((z.count / filtered.length) * 100)
                      return (
                        <span key={z.zone} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6,
                          background: colors.clinical.surfaceSoft, color: colors.text.body,
                          border: `1px solid ${colors.clinical.bg}`,
                        }}>
                          {z.label} — <b>{z.count}</b> ({pct}%)
                        </span>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Déclencheurs globaux */}
              {stats.topTriggers.length > 0 && (
                <>
                  <SubTitle>Déclencheurs les plus fréquents</SubTitle>
                  <div style={{ marginBottom: 14 }}>
                    {stats.topTriggers.map((t, i) => {
                      const pct = Math.round((t.count / filtered.length) * 100)
                      const maxTrig = Math.max(1, ...stats.topTriggers.map((x) => x.count))
                      return (
                        <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: colors.text.muted, width: 100, flexShrink: 0 }}>{t.label}</span>
                          <span style={{ flex: 1, height: 7, background: colors.clinical.bg, borderRadius: 4, overflow: 'hidden' }}>
                            <span className="anim-barFillX" style={{ display: 'block', width: `${Math.round((t.count / maxTrig) * 100)}%`, height: '100%', background: colors.green.primary, borderRadius: 4 }} />
                          </span>
                          <span style={{ fontSize: 12, color: colors.text.soft, width: 55, textAlign: 'right' }}>{t.count}x ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Cycle menstruel */}
              {profile.cycleOn && profile.gender !== 'h' && sorted.length > 0 && (
                <>
                  <SubTitle>Corrélation avec le cycle</SubTitle>
                  <CycleCorrelation episodes={sorted} profile={profile} />
                </>
              )}
            </Section>

            {/* ============ 6. TRAITEMENTS ============ */}
            {stats.treatments.length > 0 && (
              <Section title="5. Bilan thérapeutique" icon="ti-pill">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.treatments.map((t) => {
                    const rate = t.evaluated > 0 ? Math.round((t.relieved / t.evaluated) * 100) : 0
                    const pending = t.taken - t.evaluated
                    const notRelieved = t.evaluated - t.relieved
                    return (
                      <div key={t.name} style={{
                        background: colors.clinical.surfaceSoft, borderRadius: 8, padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.clinical.ink }}>{t.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: colors.text.muted }}>{t.taken} prise{t.taken > 1 ? 's' : ''}</span>
                            {t.evaluated > 0 && <EfficacyTag rate={rate} />}
                          </span>
                        </div>
                        {/* Barre empilée */}
                        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: colors.clinical.bg, marginBottom: 6 }}>
                          {t.relieved > 0 && <div className="anim-barFillX" style={{ flex: t.relieved, background: colors.green.primary, borderRadius: t.relieved === t.taken ? 5 : '5px 0 0 5px' }} />}
                          {notRelieved > 0 && <div className="anim-barFillX" style={{ flex: notRelieved, background: '#C45050', animationDelay: '.1s' }} />}
                          {pending > 0 && <div style={{ flex: pending, background: colors.clinical.bg }} />}
                        </div>
                        {/* Légende */}
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: colors.text.faint }}>
                          {t.relieved > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 2, background: colors.green.primary, flexShrink: 0 }} /> Soulagé ({t.relieved})
                            </span>
                          )}
                          {notRelieved > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 2, background: '#C45050', flexShrink: 0 }} /> Non soulagé ({notRelieved})
                            </span>
                          )}
                          {pending > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 2, background: colors.clinical.bg, border: `1px solid ${colors.border.soft}`, flexShrink: 0 }} /> En attente ({pending})
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ============ 6. RESSENTI DÉCLARÉ (« Comment te sens-tu ») ============ */}
            {feelings.length > 0 && (
              <FeelingsReport list={feelings} g={g} period={period} offset={offset} title="6. Ressenti déclaré par le patient" />
            )}

            {/* ============ 7. CYCLE MENSTRUEL (règles notées, lien avec les crises) ============ */}
            {profile.cycleOn && profile.gender !== 'h' && (normalizePeriods(profile).length > 0 || ['pill', 'pregnancy'].includes(profile.cycleMode)) && (
              <CycleReport profile={profile} episodes={allReal} />
            )}

            {/* ============ 7. SECTION ASTRO (optionnelle) ============ */}
            {showAstro && (
              <>
                <div style={{
                  borderTop: `1.5px dashed ${colors.clinical.bg}`, paddingTop: 14, marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="ti ti-moon-stars" style={{ fontSize: 16, color: colors.text.soft }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.clinical.ink }}>Annexe — Repères astronomiques</div>
                      <div style={{ fontSize: 12, color: colors.text.soft }}>Section informative, sans valeur médicale</div>
                    </div>
                  </div>
                  <button className="no-print" onClick={() => setAstroIncluded((v) => !v)}
                    style={{
                      border: `1.5px solid ${astroIncluded ? colors.green.primary : colors.border.soft}`,
                      background: astroIncluded ? colors.green.soft : 'transparent',
                      borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                      color: astroIncluded ? colors.green.primaryDark : colors.text.muted,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                    <i className={`ti ${astroIncluded ? 'ti-check' : 'ti-plus'}`} style={{ fontSize: 13 }} aria-hidden="true" />
                    {astroIncluded ? 'Inclus au PDF' : 'Inclure au PDF'}
                  </button>
                </div>
                <div className={astroIncluded ? '' : 'no-print'}>
                  <AstroSection episodes={sorted} showMoon={profile.moonOn} profile={profile} />
                </div>
              </>
            )}

            {/* ============ 8. NOTE MEDICO-LEGALE ============ */}
            <div style={{
              background: colors.clinical.surfaceSoft, borderRadius: 8,
              padding: '14px 16px', marginTop: 14, borderLeft: `3px solid ${colors.clinical.bg}`,
            }}>
              <div style={{ fontSize: 12, color: colors.text.muted, lineHeight: 1.7 }}>
                <strong style={{ color: colors.clinical.ink }}>Avertissement :</strong> Ce rapport est généré automatiquement à partir de données auto-déclaratives saisies par le patient via l'application Pousse. Il ne constitue pas un diagnostic médical. Les informations présentées sont destinées à faciliter le dialogue entre le patient et son professionnel de santé, et à fournir un historique structuré des symptômes rapportés. L'interprétation clinique de ces données relève exclusivement du professionnel de santé.
              </div>
            </div>
          </>
        )}

        {/* ============ NOTES PATIENT (saisie no-print, rendu conditionnel) ============ */}
        {filtered.length > 0 && (
          <>
            <div className="no-print" style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.text.muted, display: 'block', marginBottom: 4 }}>
                Notes pour le médecin (optionnel)
              </label>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Contexte, questions ou observations à transmettre..."
                style={{
                  width: '100%', minHeight: 60, padding: '10px 12px', fontSize: 12,
                  borderRadius: 8, border: `1px solid ${colors.clinical.bg}`,
                  background: colors.clinical.surfaceSoft, color: colors.clinical.ink,
                  fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
                }}
              />
            </div>
            {patientNotes.trim() && (
              <div className="print-only" style={{
                background: colors.clinical.surfaceSoft, borderRadius: 8,
                padding: '12px 16px', marginTop: 14, borderLeft: `3px solid ${colors.green.primary}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.clinical.ink, marginBottom: 4 }}>
                  Notes du patient
                </div>
                <div style={{ fontSize: 12, color: colors.text.body, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {patientNotes}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ BOUTON EXPORT ============ */}
        <div className="no-print" style={{ marginTop: 20 }}>
          <PrimaryButton icon="ti-download" dark onClick={handleExport}>Exporter en PDF</PrimaryButton>
          <p style={{ textAlign: 'center', fontSize: 12, color: colors.sand.faint, marginTop: 10, marginBottom: 0 }}>
            Données personnelles {'\u00b7'} partagées uniquement à ton initiative
          </p>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Helpers de calcul
// =====================================================================

function fmtDate(d) {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`
}

function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtShortDate(d) {
  const mois = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
  return `${d.getDate()} ${mois[d.getMonth()]}`
}

function groupByDate(episodes) {
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const map = {}
  episodes.forEach((ep) => {
    const d = new Date(ep.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map[key]) map[key] = {
      dateStr: key,
      fullDate: `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`,
      episodes: [],
    }
    map[key].episodes.push(ep)
  })
  return Object.values(map).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
}

function groupByCondition(episodes) {
  const map = {}
  episodes.forEach((ep) => {
    const key = ep.condition
    if (!map[key]) map[key] = {
      key,
      label: conditions[key]?.label || ep.customLabel || key,
      episodes: [],
    }
    map[key].episodes.push(ep)
  })
  return Object.values(map).sort((a, b) => b.episodes.length - a.episodes.length)
}

function computeIntensityDistribution(episodes) {
  const dist = Array.from({ length: 11 }, (_, i) => ({ level: i, count: 0, pct: 0 }))
  episodes.forEach((e) => { dist[e.intensity || 0].count++ })
  const total = episodes.length || 1
  dist.forEach((d) => { d.pct = Math.round((d.count / total) * 100) })
  return dist
}

function computeConditionBreakdown(episodes) {
  const counts = {}
  episodes.forEach((e) => { counts[e.condition] = (counts[e.condition] || 0) + 1 })
  const total = episodes.length || 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key, count,
      label: conditions[key]?.label || key,
      pct: Math.round((count / total) * 100),
    }))
}

function computeZoneBreakdown(episodes) {
  const counts = {}
  episodes.forEach((e) => (e.zones || []).forEach((z) => { counts[z] = (counts[z] || 0) + 1 }))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([zone, count]) => ({ zone, count, label: zoneLabels[zone] || zone }))
}

function computeTimeBreakdown(episodes) {
  const slots = Array.from({ length: 24 }, (_, i) => ({ slot: `${i}h`, count: 0 }))
  episodes.forEach((e) => { slots[new Date(e.createdAt).getHours()].count++ })
  return slots
}

function computeCompleteness(episodes, period, offset) {
  if (episodes.length === 0) return { tracked: 0, total: 0, pct: '0' }
  const ref = getRefDate(period, offset)
  const trackedDays = new Set(episodes.map((e) => dayKey(e.createdAt)))
  let totalDays
  if (period === 'j') totalDays = 1
  else if (period === 's') totalDays = 7
  else if (period === 'm') totalDays = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  else totalDays = ((ref.getFullYear() % 4 === 0 && ref.getFullYear() % 100 !== 0) || ref.getFullYear() % 400 === 0) ? 366 : 365
  const tracked = trackedDays.size
  return { tracked, total: totalDays, pct: `${tracked}/${totalDays}` }
}

function computeDurationBreakdown(episodes) {
  const counts = {}
  episodes.forEach((e) => {
    if (!e.duration) return
    counts[e.duration] = (counts[e.duration] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([duration, count]) => ({ duration, count }))
}

function computeAvgPerDay(episodes) {
  if (episodes.length === 0) return '0'
  const days = new Set(episodes.map((e) => {
    const d = new Date(e.createdAt)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))
  const avg = episodes.length / Math.max(1, days.size)
  return (Math.round(avg * 10) / 10).toString().replace('.', ',')
}

function computeMaxIntensityDay(episodes) {
  if (episodes.length === 0) return { value: '—', date: '—', condition: null }
  let maxI = 0, maxDate = '', maxCond = null
  episodes.forEach((e) => {
    if ((e.intensity || 0) >= maxI) {
      maxI = e.intensity || 0
      const d = new Date(e.createdAt)
      maxDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      maxCond = conditions[e.condition]?.label || e.condition
    }
  })
  return { value: String(maxI), date: maxDate, condition: maxCond }
}

function computeEvolution(episodes) {
  if (episodes.length < 3) return null
  const half = Math.floor(episodes.length / 2)
  const firstHalf = episodes.slice(0, half)
  const secondHalf = episodes.slice(half)
  const avg1 = firstHalf.reduce((s, e) => s + (e.intensity || 0), 0) / firstHalf.length
  const avg2 = secondHalf.reduce((s, e) => s + (e.intensity || 0), 0) / secondHalf.length
  const diff = avg2 - avg1
  if (Math.abs(diff) < 0.5) return { trend: 'stable', text: `Intensité stable sur la période (${(Math.round(avg2 * 10) / 10).toString().replace('.', ',')}/10 en moyenne).` }
  if (diff < 0) return { trend: 'down', text: `Tendance à l'amélioration : intensité moyenne passée de ${(Math.round(avg1 * 10) / 10).toString().replace('.', ',')}/10 à ${(Math.round(avg2 * 10) / 10).toString().replace('.', ',')}/10.` }
  return { trend: 'up', text: `Tendance à l'aggravation : intensité moyenne passée de ${(Math.round(avg1 * 10) / 10).toString().replace('.', ',')}/10 à ${(Math.round(avg2 * 10) / 10).toString().replace('.', ',')}/10.` }
}

// =====================================================================
// Composants UI cliniques
// =====================================================================

function NavBtn({ icon, onClick, label, disabled }) {
  return (
    <button onClick={onClick} aria-label={label} disabled={disabled}
      style={{
        border: 'none', background: colors.clinical.bg, borderRadius: 8,
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
        color: colors.clinical.ink, fontSize: 16,
      }}>
      <i className={`ti ${icon}`} aria-hidden="true" />
    </button>
  )
}

// Nombre de jours d'une période (pour « jours renseignés »)
function periodDayCount(period, offset) {
  const ref = getRefDate(period, offset)
  if (period === 'j') return 1
  if (period === 's') return 7
  if (period === 'm') return new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  const y = ref.getFullYear()
  return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365
}

// Section « Ressenti déclaré » : auto-évaluation quotidienne (humeur, énergie,
// symptômes) saisie depuis l'accueil. Registre clinique, tableau par jour.
function FeelingsReport({ list, g, period, offset, title }) {
  const sum = summarizeFeelings(list, g)
  const total = periodDayCount(period, offset)
  const isDay = period === 'j'
  const cell = { fontSize: 12, color: colors.clinical.ink, padding: '7px 8px', borderBottom: `1px solid ${colors.clinical.bg}`, verticalAlign: 'top', textAlign: 'left' }
  const head = { ...cell, fontWeight: 700, color: colors.text.muted, background: colors.clinical.surfaceSoft }
  const facts = [
    !isDay && { label: 'Jours renseignés', value: `${sum.days}/${total}` },
    !isDay && sum.topMood && { label: 'Humeur la plus fréquente', value: `${sum.topMood.label} (${sum.topMood.count} j)` },
    !isDay && { label: 'Énergie basse', value: `${sum.lowEnergyDays} j` },
    !isDay && sum.topSymptom && { label: 'Symptôme le plus fréquent', value: `${sum.topSymptom.label} (${sum.topSymptom.count} j)` },
    !isDay && sum.freeSymptomDays > 0 && { label: 'Notes libres', value: `${sum.freeSymptomDays} j` },
  ].filter(Boolean)
  return (
    <Section title={title} icon="ti-mood-check">
      {facts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
          {facts.map((f) => (
            <div key={f.label} style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.clinical.ink }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th scope="col" style={{ ...head, width: '18%' }}>Date</th>
              <th scope="col" style={{ ...head, width: '16%' }}>Humeur</th>
              <th scope="col" style={{ ...head, width: '14%' }}>Énergie</th>
              <th scope="col" style={{ ...head, width: '22%' }}>Symptômes</th>
              <th scope="col" style={head}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.day}>
                <td style={{ ...cell, fontWeight: 600 }}>{dayLabel(l.day, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                <td style={cell}>{moodLabel(l.mood, g) || '—'}</td>
                <td style={cell}>{energyLabel(l.energy) || '—'}</td>
                <td style={cell}>{(l.symptoms || []).length ? l.symptoms.map((k) => symptomLabel(k)).join(', ') : '—'}</td>
                <td style={{ ...cell, fontSize: 11, fontStyle: l.freeSymptom?.trim() ? 'italic' : 'normal' }}>{l.freeSymptom?.trim() || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: colors.text.soft, marginTop: 8, fontStyle: 'italic' }}>
        Auto-évaluation déclarée par le patient, non validée cliniquement.
      </div>
    </Section>
  )
}

// Section « Cycle menstruel » : situation, cycle calculé, dernières règles et
// crises dans la fenêtre menstruelle (J-2 à J+3). Porte sur l'historique noté,
// indépendamment de la période du rapport.
function CycleReport({ profile, episodes }) {
  const mode = profile.cycleMode || 'natural'
  const modeLabel = CYCLE_MODES.find((m) => m.v === mode)?.label || mode
  const periods = normalizePeriods(profile)
  const stats = cycleStats(profile)
  const starts = periods.map((p) => p.start).sort()
  const nextStart = (s) => starts[starts.indexOf(s) + 1]
  const fmtD = (k) => parseDay(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const conds = [...new Set(episodes.map((e) => e.condition))]
    .sort((a, b) => (a === 'migraine' ? -1 : b === 'migraine' ? 1 : 0))
  const analyses = starts.length >= 2 ? conds.map((c) => ({ c, a: menstrualAnalysis(profile, episodes, c) })).filter((x) => x.a.totalEpisodes > 0) : []
  const cell = { fontSize: 12, color: colors.clinical.ink, padding: '6px 8px', borderBottom: `1px solid ${colors.clinical.bg}`, textAlign: 'left' }
  const head = { ...cell, fontWeight: 700, color: colors.text.muted, background: colors.clinical.surfaceSoft }
  const pill = mode === 'pill'
    ? `${profile.pillActiveDays || 21} j actifs${(profile.pillBreakDays ?? 7) ? ` + ${profile.pillBreakDays ?? 7} j d\u2019arrêt` : ', en continu'}`
    : null
  const facts = [
    { label: 'Situation', value: pill ? `${modeLabel} (${pill})` : modeLabel },
    stats.count >= 1 && { label: 'Cycle moyen', value: `${stats.avg} j (${stats.count} cycle${stats.count > 1 ? 's' : ''}${Math.min(...stats.lengths) === Math.max(...stats.lengths) ? '' : `, de ${Math.min(...stats.lengths)} à ${Math.max(...stats.lengths)} j`})` },
    stats.count >= 3 && { label: 'Régularité', value: `écart de ${stats.variability} j${stats.irregular ? ' (supérieur à 7 j)' : ''}` },
    stats.avgPeriod && { label: 'Durée des règles', value: `${stats.avgPeriod} j en moyenne` },
  ].filter(Boolean)
  return (
    <Section title="7. Cycle menstruel" icon="ti-droplet">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
        {facts.map((f) => (
          <div key={f.label} style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.clinical.ink }}>{f.value}</div>
          </div>
        ))}
      </div>
      {periods.length > 0 && (
        <>
          <SubTitle>{mode === 'menopause' ? 'Saignements notés après la ménopause' : 'Dernières règles notées'}</SubTitle>
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead><tr>
                <th scope="col" style={{ ...head, width: '34%' }}>Début</th>
                <th scope="col" style={head}>Durée</th>
                <th scope="col" style={head}>Abondance max.</th>
                <th scope="col" style={head}>Cycle</th>
              </tr></thead>
              <tbody>
                {periods.slice(0, 6).map((p) => {
                  const len = periodLength(p), top = maxFlow(p), nx = nextStart(p.start)
                  return (
                    <tr key={p.id}>
                      <td style={cell}>{fmtD(p.start)}</td>
                      <td style={cell}>{len ? `${len} j` : '—'}</td>
                      <td style={cell}>{top ? FLOW_LEVELS.find((f) => f.v === top).label : '—'}</td>
                      <td style={cell}>{nx ? `${daysBetween(p.start, nx)} j` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {analyses.length > 0 && (
        <>
          <SubTitle>Épisodes autour des règles (J-2 à J+3)</SubTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analyses.map(({ c, a }) => (
              <div key={c} style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: colors.clinical.ink, lineHeight: 1.5 }}>
                <b>{conditions[c]?.label || c}</b> : épisodes dans la fenêtre menstruelle au cours de {a.withAttacks} cycle{a.withAttacks > 1 ? 's' : ''} sur {a.cycles.length} ({a.inWindowTotal} épisode{a.inWindowTotal > 1 ? 's' : ''} sur {a.totalEpisodes}).
                {c === 'migraine' && a.criterion !== null && (
                  <div style={{ marginTop: 4 }}>
                    Critère de migraine menstruelle (ICHD-3, annexe A1.1.1 : crises dans cette fenêtre au cours d'au moins 2 cycles sur 3) : <b>{a.criterion ? 'rempli' : 'non rempli'}</b> sur les 3 derniers cycles.
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: colors.text.soft, marginTop: 8, fontStyle: 'italic' }}>
            Repère calculé à partir des dates notées par la patiente, à interpréter par le médecin.
          </div>
        </>
      )}
    </Section>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color: colors.clinical.ink,
        borderBottom: `1.5px solid ${colors.clinical.bg}`, paddingBottom: 8, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 16, color: colors.text.soft }} aria-hidden="true" />}
        {title}
      </div>
      {children}
    </div>
  )
}

function SubTitle({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
      {children}
    </div>
  )
}

function KeyStat({ value, suffix, label }) {
  return (
    <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: colors.clinical.ink }}>
        <AnimatedNumber value={value} />{suffix && value !== '\u2014' && <span style={{ fontSize: 12, color: colors.sand.faint }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 12, color: colors.text.soft, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function MiniStat({ label, value, suffix }) {
  return (
    <div style={{ background: colors.clinical.surfaceSoft, borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.clinical.ink }}>
        {value}{suffix && <span style={{ fontSize: 12, fontWeight: 400, color: colors.sand.faint }}>{suffix}</span>}
      </div>
    </div>
  )
}

function IntensityBadge({ value }) {
  const bg = value <= 3 ? colors.green.softer : value <= 6 ? colors.amber.bg : colors.pink.soft
  const color = value <= 3 ? colors.green.primaryDark : value <= 6 ? colors.amber.text : colors.pink.text
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 600,
      background: bg, color,
    }}>{value}/10</span>
  )
}

function EfficacyTag({ rate }) {
  const bg = rate >= 60 ? colors.green.softer : rate >= 30 ? colors.amber.bg : colors.pink.soft
  const color = rate >= 60 ? colors.green.primaryDark : rate >= 30 ? colors.amber.text : colors.pink.text
  const indicator = rate >= 60 ? ' ✓' : rate >= 30 ? ' ~' : ' ✗'
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 6, fontSize: 12, fontWeight: 600,
      background: bg, color,
    }}>{rate}%{indicator}</span>
  )
}

function CycleCorrelation({ episodes, profile }) {
  const phases = {}
  let assignedCount = 0
  episodes.forEach((ep) => {
    const d = new Date(ep.createdAt)
    const phase = getCyclePhase(profile, d)
    if (!phase) return
    assignedCount++
    const key = phase.label
    if (!phases[key]) phases[key] = { label: key, count: 0, totalIntensity: 0, color: phase.color, icon: phase.icon }
    phases[key].count++
    phases[key].totalIntensity += (ep.intensity || 0)
  })
  const phaseList = Object.values(phases).sort((a, b) => b.count - a.count)
  if (phaseList.length === 0) return <div style={{ fontSize: 12, color: colors.text.faint, marginBottom: 14 }}>Données insuffisantes pour corréler.</div>

  // Chi-deux : les épisodes sont-ils distribués uniformément entre les phases ?
  const k = phaseList.length
  const expected = assignedCount / k
  const chi2 = phaseList.reduce((sum, p) => sum + ((p.count - expected) ** 2) / expected, 0)
  // Seuils chi-deux pour p < 0.05 : df=1→3.84, df=2→5.99, df=3→7.81
  const chi2Threshold = k <= 2 ? 3.84 : k <= 3 ? 5.99 : 7.81
  const significant = assignedCount >= 10 && chi2 > chi2Threshold

  const PHASE_COLORS = {
    pink: '#D4537E', green: colors.green.primary, amber: colors.amber.border, sand: colors.sand.faint,
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {phaseList.map((p) => {
        const avg = Math.round((p.totalIntensity / p.count) * 10) / 10
        const pct = Math.round((p.count / assignedCount) * 100)
        const barColor = PHASE_COLORS[p.color] || colors.green.primary
        return (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 }}>
            <span style={{ width: 90, color: colors.text.muted, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className={`ti ${p.icon}`} style={{ fontSize: 12, color: barColor }} aria-hidden="true" />
              {p.label}
            </span>
            <span style={{ flex: 1, height: 7, background: colors.clinical.bg, borderRadius: 4, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4 }} />
            </span>
            <span style={{ fontSize: 12, color: colors.text.soft, width: 85, textAlign: 'right' }}>
              {p.count}x · moy {String(avg).replace('.', ',')}/10
            </span>
          </div>
        )
      })}
      {assignedCount >= 10 && (
        <div style={{
          fontSize: 12, padding: '5px 10px', borderRadius: 5, marginTop: 6,
          background: significant ? colors.green.softer : colors.clinical.surfaceSoft,
          color: significant ? colors.green.primaryDark : colors.text.faint,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <i className={`ti ${significant ? 'ti-flag' : 'ti-equal'}`} style={{ fontSize: 12 }} aria-hidden="true" />
          {significant
            ? 'Pattern détecté — distribution non uniforme entre les phases (p < 0.05)'
            : 'Répartition uniforme — aucun pattern cyclique détecté'}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Section astronomique (optionnelle, sans valeur médicale)
// =====================================================================

const MIN_EPISODES = 15

function AstroSection({ episodes, showMoon, profile }) {
  // Avertissement
  const warning = (
    <div style={{
      background: colors.amber.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 14,
      border: `1.5px solid ${colors.amber.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <i className="ti ti-alert-triangle" style={{ color: colors.amber.text, fontSize: 16, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ fontSize: 12, color: colors.amber.text, lineHeight: 1.6 }}>
        <b>Section informative — sans valeur médicale.</b> Les corrélations présentées sont des observations purement statistiques. Elles ne constituent pas une analyse médicale.
      </div>
    </div>
  )

  // R7 : Référence chronobiologique
  const chronoRef = showMoon && (
    <div style={{
      background: colors.amber.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 14,
      border: `1px solid ${colors.border.soft}`,
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <i className="ti ti-book" style={{ color: colors.text.muted, fontSize: 16, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ fontSize: 12, color: colors.text.muted, lineHeight: 1.6 }}>
        Plusieurs études en chronobiologie ont observé des variations de la qualité du sommeil en lien avec le cycle lunaire (Cajochen et al., <i>Current Biology</i>, 2013). Cette section est proposée comme repère statistique à titre informatif.
      </div>
    </div>
  )

  // R1 + R2 : Corrélation lunaire séparée par pathologie avec seuil minimum
  let moonSection = null
  if (showMoon && episodes.length > 0) {
    const byCondition = {}
    episodes.forEach((ep) => {
      const key = ep.condition
      if (!byCondition[key]) byCondition[key] = []
      byCondition[key].push(ep)
    })

    const conditionKeys = Object.keys(byCondition).sort((a, b) => byCondition[b].length - byCondition[a].length)
    const multiCondition = conditionKeys.length > 1

    moonSection = (
      <div style={{ marginBottom: 14 }}>
        <SubTitle>Répartition lunaire</SubTitle>
        {conditionKeys.map((condKey) => {
          const condEpisodes = byCondition[condKey]
          const condLabel = conditions[condKey]?.label || condKey

          if (condEpisodes.length < MIN_EPISODES) {
            return (
              <div key={condKey} style={{ marginBottom: 10 }}>
                {multiCondition && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink, marginBottom: 4 }}>{condLabel}</div>
                )}
                <div style={{
                  fontSize: 12, color: colors.text.faint, padding: '8px 12px',
                  background: colors.clinical.surfaceSoft, borderRadius: 6,
                }}>
                  Pas assez de données pour détecter un pattern ({condEpisodes.length}/{MIN_EPISODES} épisodes)
                </div>
              </div>
            )
          }

          const buckets = MOON_PHASES_8.map((p) => ({ ...p, count: 0, totalIntensity: 0 }))
          condEpisodes.forEach((ep) => {
            const idx = getMoonPhaseIndex(getMoonPhase(new Date(ep.createdAt)))
            buckets[idx].count++
            buckets[idx].totalIntensity += (ep.intensity || 0)
          })
          buckets.forEach((b) => { b.avgIntensity = b.count > 0 ? Math.round((b.totalIntensity / b.count) * 10) / 10 : 0 })
          const maxC = Math.max(1, ...buckets.map((b) => b.count))

          // R2 : Chi-deux simplifié
          const total = condEpisodes.length
          const expected = total / 8
          const chi2 = buckets.reduce((sum, b) => sum + ((b.count - expected) ** 2) / expected, 0)
          const significant = chi2 > 14.07 // p < 0.05 pour 7 degrés de liberté

          return (
            <div key={condKey} style={{ marginBottom: 12 }}>
              {multiCondition && (
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.clinical.ink, marginBottom: 4 }}>{condLabel}</div>
              )}
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 44, marginBottom: 4 }}>
                {buckets.map((b) => (
                  <div key={b.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '100%', maxWidth: 28, borderRadius: 3,
                      height: b.count > 0 ? Math.max(4, (b.count / maxC) * 38) : 0,
                      background: b.key === 'pleine' ? '#C4B17C' : b.key === 'nouvelle' ? colors.text.muted : colors.green.leaf,
                      opacity: b.count > 0 ? 0.85 : 0.2,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                {buckets.map((b) => (
                  <div key={b.key} style={{ flex: 1, textAlign: 'center' }}>
                    <i className={`ti ${b.icon}`} style={{ fontSize: 12, color: b.color }} aria-hidden="true" />
                    <div style={{ fontSize: 12, color: colors.text.faint }}>{b.count || ''}</div>
                  </div>
                ))}
              </div>
              <div style={{
                fontSize: 12, padding: '5px 10px', borderRadius: 5,
                background: significant ? colors.green.softer : colors.clinical.surfaceSoft,
                color: significant ? colors.green.primaryDark : colors.text.faint,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <i className={`ti ${significant ? 'ti-flag' : 'ti-equal'}`} style={{ fontSize: 12 }} aria-hidden="true" />
                {significant
                  ? 'Pattern détecté — distribution non uniforme (p < 0.05)'
                  : 'Répartition uniforme — aucun pattern lunaire détecté'}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Matrice croisée Cycle × Lune (seuil 30 épisodes)
  const showCross = showMoon && profile && profile.cycleOn && profile.gender !== 'h' && episodes.length >= 30
  let crossSection = null
  if (showCross) {
    const cycleLabels = ['Règles', 'Folliculaire', 'Ovulation', 'Lutéale']
    const cycleIcons = ['ti-droplet', 'ti-arrow-up', 'ti-sun', 'ti-leaf']
    const moonLabels = ['Nouvelle', 'Croissant', 'Quartier', 'Pleine']
    const moonGroupOf = (p) => (p < 0.125 || p >= 0.875) ? 0 : p < 0.375 ? 1 : p < 0.625 ? 2 : 3
    const matrix = Array.from({ length: 4 }, () => Array(4).fill(0))
    let assigned = 0
    episodes.forEach((ep) => {
      const d = new Date(ep.createdAt)
      const cp = getCyclePhase(profile, d)
      if (!cp) return
      const mi = moonGroupOf(getMoonPhase(d))
      matrix[cp.phaseIndex][mi]++
      assigned++
    })
    if (assigned >= 30) {
      const maxVal = Math.max(1, ...matrix.flat())
      crossSection = (
        <div style={{ marginBottom: 14 }}>
          <SubTitle>Matrice Cycle × Lune</SubTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 6px', textAlign: 'left', color: colors.text.faint, fontWeight: 500 }} />
                  {moonLabels.map((l) => (
                    <th key={l} style={{ padding: '4px 6px', textAlign: 'center', color: colors.text.faint, fontWeight: 500 }}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cycleLabels.map((cl, ci) => (
                  <tr key={cl}>
                    <td style={{ padding: '4px 6px', color: colors.text.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <i className={`ti ${cycleIcons[ci]}`} style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
                      {cl}
                    </td>
                    {matrix[ci].map((val, mi) => {
                      const intensity = val / maxVal
                      const bg = val === 0 ? colors.clinical.surfaceSoft
                        : intensity > 0.7 ? '#C45050'
                        : intensity > 0.4 ? colors.amber.bar
                        : colors.green.leaf
                      return (
                        <td key={mi} style={{
                          padding: '6px 4px', textAlign: 'center',
                          background: val > 0 ? alpha(bg, 19) : colors.clinical.surfaceSoft,
                          borderRadius: 3,
                        }}>
                          <span style={{
                            display: 'inline-block', minWidth: 22, padding: '2px 5px',
                            borderRadius: 4, fontWeight: 600,
                            background: val > 0 ? bg : 'transparent',
                            color: val > 0 ? '#fff' : colors.text.faint,
                            opacity: val > 0 ? 0.85 : 0.5,
                          }}>
                            {val || '·'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: colors.text.faint, marginTop: 4, fontStyle: 'italic' }}>
            {assigned} épisodes analysés · couleur = concentration relative
          </div>
        </div>
      )
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {warning}
      {chronoRef}
      {moonSection}
      {crossSection}
    </div>
  )
}
