import { useState, useEffect } from 'react'
import { colors, radius, shadow } from '../theme/tokens'
import { Screen, ScreenHeader, Toggle, Segmented, useToast } from '../components/ui'
import EveningReminder from '../components/EveningReminder'
import { useStore } from '../data/store'
import CloudBackup from '../components/CloudBackup'
import { BodySection, LifestyleSection } from '../components/HealthProfile'
import { CycleModePicker, PeriodsSection } from '../components/CycleTracking'
import { CustomConditionsSection } from '../components/CustomConditions'
import { isRemoteMode } from '../data/remote'
import { CYCLE_LENGTH_RANGE, PHASE_RANGES, getEffectivePhaseDurations } from '../data/storage'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Profile({ bp = 'mobile', onLogout, onShowHelp }) {
  const { profile, updateProfile, episodes } = useStore()
  const toast = useToast()
  const [showPhases, setShowPhases] = useState(false)
  const isDesktop = bp === 'desktop'
  const isTablet = bp === 'tablet'

  const genders = [
    { value: 'f', label: 'Femme' },
    { value: 'h', label: 'Homme' },
    { value: 'n', label: 'Non précisé' },
  ]

  return (
    <Screen bp={bp} wide={isDesktop || isTablet}>
      <ScreenHeader title="Mon profil" bp={bp} />

      {(isDesktop || isTablet) ? (
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.3fr 1fr' : '1.2fr 1fr', gap: isDesktop ? 32 : 24, alignItems: 'start' }}>
          <ProfileLeftColumn profile={profile} updateProfile={updateProfile} toast={toast} genders={genders} showPhases={showPhases} setShowPhases={setShowPhases} wide={isDesktop} isTablet={isTablet} />
          <ProfileRightColumn toast={toast} onLogout={onLogout} onShowHelp={onShowHelp} wide={isDesktop} />
        </div>
      ) : (
        <>
          <ProfileLeftColumn profile={profile} updateProfile={updateProfile} toast={toast} genders={genders} showPhases={showPhases} setShowPhases={setShowPhases} wide={false} isTablet={false} />
          <ProfileRightColumn toast={toast} onLogout={onLogout} onShowHelp={onShowHelp} wide={false} />
        </>
      )}
    </Screen>
  )
}

function ProfileLeftColumn({ profile, updateProfile, toast, genders, showPhases, setShowPhases, wide, isTablet }) {
  const { episodes } = useStore()
  return (
    <div>
      <Label>Je suis</Label>
      <div style={{ display: 'flex', gap: wide ? 10 : 7, marginBottom: wide ? 24 : 20, flexWrap: 'wrap' }}>
        {genders.map((g) => {
          const active = g.value === profile.gender
          return (
            <button key={g.value} onClick={() => updateProfile({ gender: g.value })}
              style={{
                flex: '1 1 auto', minWidth: wide ? 100 : 80, fontSize: wide ? 14 : 13, padding: wide ? '11px 0' : '9px 0', borderRadius: radius.md, cursor: 'pointer',
                border: `1.5px solid ${active ? colors.green.primary : colors.border.soft}`,
                background: active ? colors.green.primary : 'transparent',
                color: active ? colors.onPrimary : colors.text.muted,
                boxShadow: active ? shadow.button : shadow.xs,
              }}>
              {g.label}
            </button>
          )
        })}
      </div>

      <BirthYearField profile={profile} updateProfile={updateProfile} toast={toast} wide={wide} />
      <CustomConditionsSection profile={profile} updateProfile={updateProfile} toast={toast} episodes={episodes} wide={wide} />
      <BodySection profile={profile} updateProfile={updateProfile} toast={toast} wide={wide} />

      {(profile.gender === 'f' || profile.gender === 'n') && (
        <div style={{ background: colors.green.soft, borderRadius: radius.lg, padding: wide ? '18px 20px 20px' : '15px 15px 16px', marginBottom: wide ? 18 : 14, boxShadow: shadow.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.title, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-droplet" aria-hidden="true" /> Mon cycle
            </span>
            <button onClick={() => updateProfile({ cycleOn: !profile.cycleOn })} aria-label="Activer le suivi du cycle"
              style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <Toggle on={profile.cycleOn} />
            </button>
          </div>
          <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 13 }}>Pour relier tes épisodes à ton cycle</div>
          {profile.cycleOn && (
            <>
              <CycleModePicker
                profile={profile}
                onChange={(v) => {
                  const patch = { cycleMode: v }
                  if (v === 'endo' && !profile.periodDays && !profile.lutealDays && !profile.ovulationDays) {
                    patch.cycleLength = profile.cycleLength || CYCLE_LENGTH_RANGE.endo.default
                  }
                  if (v === 'natural' && profile.cycleLength > CYCLE_LENGTH_RANGE.natural.max) {
                    patch.cycleLength = CYCLE_LENGTH_RANGE.natural.max
                  }
                  updateProfile(patch)
                }}
              />
              {['natural', 'endo'].includes(profile.cycleMode || 'natural') ? (() => {
                const mode = profile.cycleMode || 'natural'
                const range = CYCLE_LENGTH_RANGE[mode === 'endo' ? 'endo' : 'natural']
                const eff = getEffectivePhaseDurations(profile)
                return (
                  <>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <MiniField label="Durée habituelle">
                        <input type="number" min={range.min} max={range.max} value={profile.cycleLength || range.default}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (v >= range.min && v <= range.max) updateProfile({ cycleLength: v })
                          }}
                          style={inputStyle} /> j
                      </MiniField>
                      {/* Les dates de règles se notent dans « Mes règles » ci-dessous */}
                    </div>
                    <button onClick={() => setShowPhases(!showPhases)}
                      style={{
                        border: 'none', background: 'transparent', padding: '8px 0 4px',
                        fontSize: 12, color: colors.green.primaryDark, cursor: 'pointer',
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                        opacity: 0.8,
                      }}>
                      <i className={`ti ti-chevron-${showPhases ? 'up' : 'down'}`} style={{ fontSize: 14 }} aria-hidden="true" />
                      Ajuster les phases
                    </button>
                    {showPhases && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <MiniField label="Règles">
                            <input type="number" min={PHASE_RANGES.periodDays.min} max={PHASE_RANGES.periodDays.max}
                              value={profile.periodDays ?? eff.periodDays}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                if (v >= PHASE_RANGES.periodDays.min && v <= PHASE_RANGES.periodDays.max) updateProfile({ periodDays: v })
                              }}
                              style={inputStyle} /> j
                          </MiniField>
                          <MiniField label="Ovulation">
                            <input type="number" min={PHASE_RANGES.ovulationDays.min} max={PHASE_RANGES.ovulationDays.max}
                              value={profile.ovulationDays ?? eff.ovulationDays}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                if (v >= PHASE_RANGES.ovulationDays.min && v <= PHASE_RANGES.ovulationDays.max) updateProfile({ ovulationDays: v })
                              }}
                              style={inputStyle} /> j
                          </MiniField>
                          <MiniField label="Lutéale">
                            <input type="number" min={PHASE_RANGES.lutealDays.min} max={PHASE_RANGES.lutealDays.max}
                              value={profile.lutealDays ?? eff.lutealDays}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                if (v >= PHASE_RANGES.lutealDays.min && v <= PHASE_RANGES.lutealDays.max) updateProfile({ lutealDays: v })
                              }}
                              style={inputStyle} /> j
                          </MiniField>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <MiniField label="Folliculaire">
                            <span style={{ fontSize: 14, fontWeight: 600, color: colors.text.body }}>{eff.follicularDays} j</span>
                            <i className="ti ti-info-circle" style={{ fontSize: 13, color: colors.text.faint, marginLeft: 4 }}
                              title="Calculé automatiquement : durée du cycle moins les autres phases" aria-hidden="true" />
                          </MiniField>
                        </div>
                        {eff.follicularDays < 3 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: colors.amber.bg, borderRadius: radius.sm, padding: '6px 10px' }}>
                            <i className="ti ti-alert-triangle" style={{ color: colors.amber.text, fontSize: 13 }} aria-hidden="true" />
                            <span style={{ fontSize: 12, color: colors.amber.text }}>Phase folliculaire très courte</span>
                          </div>
                        )}
                        <button onClick={() => {
                          updateProfile({ periodDays: null, lutealDays: null, ovulationDays: null })
                          toast('Phases réinitialisées', 'success')
                        }}
                          style={{
                            border: 'none', background: 'transparent', padding: 0,
                            fontSize: 12, color: colors.text.faint, cursor: 'pointer',
                            fontFamily: 'inherit', textDecoration: 'underline',
                            alignSelf: 'flex-start',
                          }}>
                          Réinitialiser les phases
                        </button>
                      </div>
                    )}
                    <PeriodsSection profile={profile} updateProfile={updateProfile} toast={toast} />
                  </>
                )
              })() : (profile.cycleMode === 'pill') ? (
                <>
                <div role="group" aria-label="Type de plaquette" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[[21, 7, '21 jours + 7 d\u2019arrêt'], [24, 4, '24 jours + 4 d\u2019arrêt'], [28, 0, 'En continu']].map(([a, b, l]) => {
                    const on = (profile.pillActiveDays || 21) === a && (profile.pillBreakDays ?? 7) === b
                    return (
                      <button key={l} type="button" aria-pressed={on} onClick={() => updateProfile({ pillActiveDays: a, pillBreakDays: b })}
                        style={{
                          minHeight: 40, padding: '0 12px', borderRadius: radius.sm, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                          border: `1.5px solid ${on ? colors.green.primary : colors.border.soft}`, background: on ? colors.green.softer : colors.green.surface,
                          color: on ? colors.text.title : colors.text.body, fontWeight: on ? 700 : 500,
                        }}>{l}</button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <MiniField label="Jours actifs">
                    <input type="number" min={1} max={28} value={profile.pillActiveDays || 21}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (v >= 1 && v <= 28) updateProfile({ pillActiveDays: v })
                      }}
                      style={inputStyle} /> j
                  </MiniField>
                  <MiniField label="Jours pause">
                    <input type="number" min={0} max={14} value={profile.pillBreakDays ?? 7}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (v >= 0 && v <= 14) updateProfile({ pillBreakDays: v })
                      }}
                      style={inputStyle} /> j
                  </MiniField>
                  <MiniField label="Début plaquette">
                    <input type="date" value={profile.pillPackStart || ''} max={todayISO()}
                      onChange={(e) => {
                        if (e.target.value && e.target.value > todayISO()) return
                        updateProfile({ pillPackStart: e.target.value })
                      }}
                      style={{ ...inputStyle, width: '100%' }} />
                  </MiniField>
                </div>
                </>
              ) : (profile.cycleMode !== 'pregnancy'
                ? <PeriodsSection profile={profile} updateProfile={updateProfile} toast={toast} />
                : null)}
            </>
          )}
        </div>
      )}

      <LifestyleSection profile={profile} updateProfile={updateProfile} wide={wide} toast={toast} />

      <Label style={{ marginTop: 18 }}>Repères personnels</Label>

      <div style={{ background: colors.sand.bg, borderRadius: radius.lg, padding: wide ? 20 : 15, marginBottom: wide ? 14 : 10, boxShadow: shadow.card }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text.body, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-moon" aria-hidden="true" /> Repères lunaires
            </div>
            <div style={{ fontSize: 12, color: colors.sand.text, marginTop: 4, lineHeight: 1.5 }}>
              Affiche la phase lunaire actuelle et le cycle des phases.
            </div>
          </div>
          <button onClick={() => updateProfile({ moonOn: !profile.moonOn })}
            aria-label="Activer les repères lunaires"
            style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 2 }}>
            <Toggle on={profile.moonOn} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: colors.amber.bg, borderRadius: radius.sm, padding: '8px 10px', marginBottom: 14 }}>
        <i className="ti ti-info-circle" style={{ color: colors.amber.text, fontSize: 15 }} aria-hidden="true" />
        <span style={{ fontSize: 12, color: colors.amber.text, lineHeight: 1.45 }}>
          Repère personnel sans valeur médicale.
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <p style={{ textAlign: 'center', fontSize: 12, color: colors.text.faint, marginTop: 6, marginBottom: 16 }}>
        Désactivés par défaut, activables quand tu veux
      </p>
    </div>
  )
}

function ProfileRightColumn({ toast, onLogout, onShowHelp, wide }) {
  return (
    <div>
      <EveningReminder toast={toast} wide={wide} />
      {isRemoteMode() && <CloudBackup toast={toast} onAccountDeleted={onLogout} wide={wide} />}
      {!isRemoteMode() && (
        <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 18, lineHeight: 1.5 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
          Tes données restent sur cet appareil.
        </div>
      )}

      {onShowHelp && (
        <button onClick={onShowHelp}
          style={{
            width: '100%', border: `1.5px solid ${colors.green.primary}`,
            background: colors.green.soft, color: colors.green.primaryDark, padding: 13,
            borderRadius: radius.lg, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            marginBottom: 10,
          }}>
          <i className="ti ti-help-circle" aria-hidden="true" /> Aide & tutoriel
        </button>
      )}

      {onLogout && (
        <button onClick={onLogout}
          style={{
            width: '100%', border: `1.5px solid ${colors.border.soft}`,
            background: 'transparent', color: colors.text.muted, padding: 13,
            borderRadius: radius.lg, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
          <i className="ti ti-logout" aria-hidden="true" /> Se déconnecter
        </button>
      )}

    </div>
  )
}

const inputStyle = {
  border: `1px solid ${colors.border.soft}`, borderRadius: 8, padding: '4px 6px',
  fontSize: 14, fontWeight: 600, color: colors.text.body, width: 40,
  background: colors.green.surface, fontFamily: 'inherit',
}

// Année de naissance (facultative). On enregistre l'année plutôt qu'un âge,
// qui deviendrait faux l'année suivante, et plutôt qu'une date complète, qui
// identifierait davantage la personne. Affichée dans le rapport médecin.
const BIRTH_YEAR_MIN = 1920
function BirthYearField({ profile, updateProfile, toast, wide }) {
  const thisYear = new Date().getFullYear()
  const [draft, setDraft] = useState(profile.birthYear ? String(profile.birthYear) : '')
  const saved = profile.birthYear ? String(profile.birthYear) : ''
  // Valeur modifiée ailleurs (autre appareil, synchronisation) : on l'affiche
  useEffect(() => { setDraft(saved) }, [saved])
  function commit() {
    const v = draft.trim()
    if (v === saved) return
    if (v === '') { updateProfile({ birthYear: null }); return }
    const n = Number(v)
    if (!Number.isInteger(n) || n < BIRTH_YEAR_MIN || n > thisYear) {
      toast(`Indique une année entre ${BIRTH_YEAR_MIN} et ${thisYear}`, 'error')
      setDraft(saved)
      return
    }
    updateProfile({ birthYear: n })
    toast('Année de naissance enregistrée', 'success')
  }
  const age = profile.birthYear ? thisYear - profile.birthYear : null
  return (
    <div style={{ marginBottom: wide ? 24 : 20 }}>
      <label htmlFor="birth-year" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: colors.text.muted, marginBottom: 6 }}>
        Année de naissance <span style={{ fontWeight: 400 }}>(facultatif)</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input id="birth-year" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
          autoComplete="bday-year" placeholder="Ex. 1990"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          aria-describedby="birth-year-hint"
          style={{
            width: 110, minHeight: 44, padding: '0 12px', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box',
            border: `1.5px solid ${colors.border.soft}`, borderRadius: radius.small,
            background: colors.green.surface, color: colors.text.body,
          }} />
        {age !== null && (
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text.title }}>{age} ans cette année</span>
        )}
      </div>
      <div id="birth-year-hint" style={{ fontSize: 12, color: colors.text.soft, marginTop: 6 }}>
        Indiquée dans ton rapport médecin.
      </div>
    </div>
  )
}

function Label({ children, style }) {
  return <div style={{ fontSize: 13, color: colors.text.muted, marginBottom: 8, ...style }}>{children}</div>
}

function MiniField({ label, children }) {
  return (
    <div style={{ flex: 1, background: colors.green.surface, borderRadius: radius.sm, padding: '9px 11px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 12, color: colors.text.soft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: colors.text.body, display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
    </div>
  )
}
