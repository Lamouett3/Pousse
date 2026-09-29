import { useState, useCallback, useEffect, useRef } from 'react'
import { colors, radius, font, shadow, CONTAINER, NAV_HEIGHT, alpha } from './theme/tokens'
import { StoreProvider } from './data/store'
import { useBreakpoint } from './theme/useBreakpoint'
import { getSession, logout, migrateIfNeeded, seedTestAccount, currentAccountName, currentAccountId, clearSession, setConsentRequired } from './data/auth'
import { startSync, stopSync } from './data/sync'
import { isRemoteMode } from './data/remote'
import { ErrorBoundary, ToastProvider, useToast, ConfirmDialog, ThemeToggle } from './components/ui'
import { useStore } from './data/store'
import Auth from './screens/Auth'
import Consent from './screens/Consent'
import { MEDICAL_DISCLAIMER } from './components/HealthConsent'
import Home from './screens/Home'
import Dashboard from './screens/Dashboard'
import LogEpisode from './screens/LogEpisode'
import Profile from './screens/Profile'
import MedicalReport from './screens/MedicalReport'
import QuickLog from './screens/QuickLog'
import { needsEfficacyFollowUp } from './data/stats'
import { startLocalReminders, stopRemindersOnLogout } from './data/reminders'
import { dayKey } from './data/storage'

const TABS = [
  { id: 'home', label: 'Accueil', icon: 'ti-home' },
  { id: 'dashboard', label: 'Historique', icon: 'ti-chart-bar' },
  { id: 'log', label: 'Noter', icon: 'ti-plus' },
  { id: 'report', label: 'Rapport', icon: 'ti-file-text' },
  { id: 'profile', label: 'Profil', icon: 'ti-user' },
]

// --- Onboarding premier lancement ---

// Tutoriel de premier lancement : mémorisé PAR COMPTE, pour qu'un compte
// nouvellement créé le voie même si un autre compte l'a déjà vu sur l'appareil.
const LEGACY_ONBOARDING_KEY = 'pousse.onboarding.done' // ancienne clé, globale à l'appareil
const onboardingKey = (accountId) => `pousse.${accountId}.onboarding.done`

function isOnboarded(accountId) {
  if (!accountId) return false
  try {
    if (localStorage.getItem(onboardingKey(accountId)) === '1') return true
    // Migration : un compte qui utilisait déjà l'app (épisodes existants) sous
    // l'ancienne clé globale ne revoit pas le tutoriel.
    if (localStorage.getItem(LEGACY_ONBOARDING_KEY) === '1') {
      const eps = JSON.parse(localStorage.getItem(`pousse.${accountId}.episodes.v1`) || '[]')
      if (Array.isArray(eps) && eps.length > 0) {
        localStorage.setItem(onboardingKey(accountId), '1')
        return true
      }
    }
  } catch { /* stockage indisponible : on montre le tutoriel */ }
  return false
}

function markOnboarded() {
  try { localStorage.setItem(onboardingKey(currentAccountId()), '1') } catch { /* rien */ }
}

const ONBOARDING_STEPS = [
  {
    icon: 'ti-heart-rate-monitor',
    title: 'Bienvenue sur Pousse',
    desc: 'Une application pour suivre tes symptômes chroniques au quotidien. Migraine, SII, fibromyalgie… tout au même endroit.',
  },
  {
    icon: 'ti-bolt',
    title: 'Saisie en quelques secondes',
    desc: 'Choisis ta pathologie, glisse l\'intensité, note la durée et les déclencheurs. Même un jour de crise, c\'est rapide.',
  },
  {
    icon: 'ti-plant',
    title: 'Ton jardin grandit avec toi',
    desc: 'Chaque jour suivi fait pousser une fleur. En 7 jours, ton jardin sera en pleine floraison. C\'est ta récompense.',
  },
  {
    icon: 'ti-chart-bar',
    title: 'Visualise tes tendances',
    desc: 'Semaine, mois ou année : repère les périodes intenses, les jours calmes et tes déclencheurs les plus fréquents.',
  },
  {
    icon: 'ti-file-text',
    title: 'Un rapport pour ton médecin',
    desc: 'Génère un document clinique avec tes stats, traitements et corrélations. Exporte-le en PDF pour ta consultation.',
  },
  {
    icon: 'ti-rocket',
    title: 'Raccourcis et efficacité',
    desc: 'Enregistre des raccourcis pour tes épisodes types. L\'app te rappellera de noter si ton traitement a fonctionné.',
  },
  // Toujours en dernier : « Passer » y mène au lieu de fermer le tutoriel
  {
    icon: 'ti-stethoscope',
    title: 'Un outil de suivi, pas un avis médical',
    desc: MEDICAL_DISCLAIMER,
  },
]

// Composant réutilisable : premier lancement (plein écran) ou aide (modal overlay)
function Onboarding({ onDone, bp, isModal = false }) {
  const [step, setStep] = useState(0)
  const isLast = step === ONBOARDING_STEPS.length - 1
  const s = ONBOARDING_STEPS[step]
  const isDesktop = bp === 'desktop'

  function handleNext() {
    if (isLast) {
      if (!isModal) markOnboarded()
      onDone()
    } else {
      setStep((n) => n + 1)
    }
  }

  function handleSkip() {
    // Premier lancement : « Passer » mène à l'avertissement médical, qu'on ne saute pas
    if (!isModal && !isLast) { setStep(ONBOARDING_STEPS.length - 1); return }
    if (!isModal) markOnboarded()
    onDone()
  }

  const card = (
    <div key={step} className="anim-fadeIn" style={{
      width: isDesktop ? 420 : '100%', maxWidth: 420,
      background: colors.green.surface, borderRadius: radius.card,
      padding: isDesktop ? '44px 40px 36px' : '36px 28px 28px',
      border: `0.5px solid ${colors.border.soft}`,
      boxShadow: shadow.lg, textAlign: 'center',
    }}>
      {isModal && (
        <button onClick={handleSkip} aria-label="Fermer" style={{
          position: 'absolute', top: 14, right: 14, border: 'none', background: 'transparent',
          color: colors.text.faint, fontSize: 20, cursor: 'pointer', padding: 4,
        }}>
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      )}

      <div className="anim-popIn" style={{
        width: 60, height: 60, borderRadius: 999, margin: '0 auto 20px',
        background: colors.green.soft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${s.icon}`} style={{ fontSize: 26, color: colors.green.primary }} aria-hidden="true" />
      </div>

      <div style={{
        fontFamily: font.display, fontSize: 19, fontWeight: 600,
        color: colors.text.title, lineHeight: 1.3, marginBottom: 10,
        letterSpacing: '-0.01em',
      }}>
        {s.title}
      </div>

      <p style={{
        fontSize: 13, color: colors.text.muted, lineHeight: 1.6,
        margin: '0 0 28px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto',
      }}>
        {s.desc}
      </p>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {ONBOARDING_STEPS.map((_, i) => (
          <button key={i} onClick={() => setStep(i)} aria-label={`Étape ${i + 1}`} style={{
            width: i === step ? 18 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
            background: i === step ? colors.green.primary : colors.green.softer,
            transition: 'width .3s ease, background .3s ease',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep((n) => n - 1)} style={{
            flex: 1, border: `1.5px solid ${colors.border.soft}`, background: 'transparent',
            color: colors.text.muted, padding: 13, borderRadius: radius.lg, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <i className="ti ti-chevron-left" aria-hidden="true" /> Retour
          </button>
        )}
        <button onClick={handleNext} style={{
          flex: step > 0 ? 1.5 : 1, border: 'none', background: colors.green.primary,
          color: colors.onPrimary, padding: 13, borderRadius: radius.lg, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: shadow.button, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 7, width: step === 0 ? '100%' : undefined,
        }}>
          {isLast ? (isModal ? 'Fermer' : 'Commencer') : 'Suivant'}
          <i className={`ti ${isLast ? (isModal ? 'ti-check' : 'ti-arrow-right') : 'ti-chevron-right'}`} aria-hidden="true" />
        </button>
      </div>

      {!isLast && !isModal && (
        <button onClick={handleSkip} style={{
          border: 'none', background: 'transparent', color: colors.text.faint,
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 4, marginTop: 10,
        }}>
          Passer
        </button>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
        onClick={(e) => { if (e.target === e.currentTarget) handleSkip() }}>
        <div style={{ position: 'relative' }}>{card}</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'transparent', fontFamily: font.family,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {card}
    </div>
  )
}

function Logo({ size = 34 }) {
  // viewBox cadre sur la masse visuelle (feuilles + fleur + tige courte)
  return (
    <svg width={size} height={size} viewBox="20 26 80 72" role="img" aria-label="Logo Pousse" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="logo-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#2E4034" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter="url(#logo-shadow)">
        <circle className="logo-seed" cx="60" cy="88" r="5" fill="#8B6F47" />
        <path className="logo-stem" d="M60 92 C60 78 59 66 56 56" stroke="#3F6B49" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path className="logo-leaf-l1" d="M56 60 C50 48 38 44 26 45 C28 60 40 66 54 63 C55 62 56 61 56 60 Z" fill="#7FB089" />
        <path className="logo-leaf-l2" d="M56 60 C50 50 40 47 30 47 C34 57 43 61 53 60 Z" fill="#9FC4A4" />
        <path className="logo-leaf-r1" d="M58 52 C60 38 72 30 86 30 C85 46 73 54 59 53 C58 53 58 52 58 52 Z" fill="#5A8262" />
        <path className="logo-leaf-r2" d="M58 52 C61 40 71 34 82 33 C80 44 71 50 59 50 Z" fill="#7FB089" />
        <circle className="logo-bloom" cx="60" cy="40" r="11" fill="#F3C8D2" />
        <circle className="logo-center" cx="60" cy="40" r="4.5" fill="#E9B85E" />
      </g>
    </svg>
  )
}

function Screens({ tab, setTab, bp, onLogout, editEpisodeId, onEditEpisode, onEditDone, onShowHelp, ecouteSignal }) {
  switch (tab) {
    case 'home': return <Home bp={bp} onLog={() => setTab('log')} onQuickLog={() => setTab('quick')} onSeeHistory={() => setTab('dashboard')} ecouteSignal={ecouteSignal} />
    case 'quick': return <QuickLog bp={bp} onClose={() => setTab('home')} onMoreDetails={() => setTab('log')} />
    case 'dashboard': return <Dashboard bp={bp} onLog={() => setTab('log')} onEditEpisode={onEditEpisode} />
    case 'log': return <LogEpisode bp={bp} editEpisodeId={editEpisodeId} onBack={onEditDone} onSaved={onEditDone} />
    // Le rapport suit le thème à l'écran ; l'impression / le PDF restent clairs (tokens.js)
    case 'report': return <MedicalReport bp={bp} />
    case 'profile': return <Profile bp={bp} onLogout={onLogout} onShowHelp={onShowHelp} />
    default: return null
  }
}

function AppInner({ bp, isDesktop, accountName, onLogout }) {
  const { episodes, cycleLogs } = useStore()
  const [tab, setTab] = useState('home')
  // Rappel du soir : ouverture depuis la notification (?ecoute=1, ou message du
  // service worker si l'app était déjà ouverte) → accueil, sur le ressenti du jour
  const [ecouteSignal, setEcouteSignal] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('ecoute') ? 1 : 0 } catch { return 0 }
  })
  useEffect(() => {
    if (ecouteSignal && window.location.search.includes('ecoute')) window.history.replaceState(null, '', window.location.pathname)
    const open = () => { setEditEpisodeId(null); setTab('home'); setEcouteSignal((n) => n + 1) }
    const onSwMessage = (e) => { if (e.data?.type === 'pousse:ecoute') open() }
    window.addEventListener('pousse:ecoute', open)
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () => {
      window.removeEventListener('pousse:ecoute', open)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  // Mode local du rappel (sans push) : vérifié tant que l'app est ouverte
  const cycleLogsRef = useRef(cycleLogs)
  cycleLogsRef.current = cycleLogs
  useEffect(() => startLocalReminders(() => {
    const today = dayKey(new Date())
    return cycleLogsRef.current.some((l) => l.day === today)
  }), [])
  const [editEpisodeId, setEditEpisodeId] = useState(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Badge : nombre d'épisodes avec traitement sans efficacité renseignée (48h)
  const pendingEfficacyCount = episodes.filter((e) => needsEfficacyFollowUp(e)).length

  // Navigation normale : quitte toujours le mode edition en cours
  const goTab = useCallback((id) => { setEditEpisodeId(null); setTab(id) }, [])
  const openEditEpisode = useCallback((id) => { setEditEpisodeId(id); setTab('log') }, [])
  const closeLog = useCallback(() => {
    setTab(editEpisodeId ? 'dashboard' : 'home')
    setEditEpisodeId(null)
  }, [editEpisodeId])

  const handleLogout = useCallback(() => setConfirmLogout(true), [])
  const doLogout = useCallback(() => { setConfirmLogout(false); onLogout() }, [onLogout])

  // ---------- DESKTOP : navigation latérale ----------
  if (isDesktop) {
    return (
      <div style={{ height: '100vh', background: 'transparent', fontFamily: font.family, display: 'flex', overflow: 'hidden' }}>
        <aside className="no-print" style={{
          width: 240, flexShrink: 0, background: colors.green.surface,
          borderRight: `0.5px solid ${colors.border.soft}`, padding: '28px 18px',
          display: 'flex', flexDirection: 'column', height: '100%',
          boxShadow: shadow.sidebar,
        }}>
          <div style={{ padding: '0 6px', marginBottom: 24 }}>
            <button onClick={() => goTab('home')} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Logo size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 21, fontWeight: 600, color: colors.text.title, lineHeight: 1, letterSpacing: '-0.01em' }}>Pousse</div>
                <div style={{ fontSize: 12, color: colors.text.faint, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 2 }}>jour après jour</div>
              </div>
            </button>
            <div style={{ height: 1, background: `linear-gradient(90deg, ${colors.green.leafLight}, transparent)`, marginTop: 16 }} />
          </div>
          {accountName && (
            <button onClick={() => goTab('profile')} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', marginBottom: 16,
              background: colors.green.soft, borderRadius: radius.md, fontSize: 13, color: colors.text.muted,
              boxShadow: shadow.xs, border: `0.5px solid ${colors.border.soft}`,
              width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.green.leaf}, ${colors.green.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-user" style={{ fontSize: 13, color: colors.onPrimary }} aria-hidden="true" />
              </div>
              <span style={{ fontWeight: 500 }}>{accountName}</span>
            </button>
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map((t) => {
              const active = tab === t.id
              const isPrimary = t.id === 'log'
              const showBadge = t.id === 'home' && pendingEfficacyCount > 0 && tab !== 'home'
              return (
                <button key={t.id} onClick={() => goTab(t.id)}
                  aria-label={showBadge ? `${t.label} (${pendingEfficacyCount} traitement${pendingEfficacyCount > 1 ? 's' : ''} à évaluer)` : undefined}
                  onMouseEnter={(e) => { if (!isPrimary && !active) e.currentTarget.style.background = colors.green.soft }}
                  onMouseLeave={(e) => { if (!isPrimary && !active) e.currentTarget.style.background = 'transparent' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                    background: isPrimary ? colors.green.primary : active ? colors.green.soft : 'transparent',
                    color: isPrimary ? colors.onPrimary : active ? colors.green.primaryDark : colors.text.muted,
                    fontWeight: isPrimary || active ? 600 : 400, fontSize: 14, textAlign: 'left',
                    fontFamily: 'inherit',
                    boxShadow: isPrimary ? shadow.button : 'none',
                    marginBottom: isPrimary ? 6 : 0,
                    position: 'relative',
                    transition: 'background .2s ease',
                  }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
                  {t.label}
                  {showBadge && (
                    <span style={{
                      marginLeft: 'auto', minWidth: 20, height: 20, borderRadius: 999,
                      background: colors.coral.barStrong, color: colors.onPrimary,
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px',
                    }}>{pendingEfficacyCount}</span>
                  )}
                </button>
              )
            })}
          </nav>
          <div style={{ marginTop: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <ThemeToggle withLabel />
            <div style={{ fontSize: 12, color: colors.text.faint }}>{isRemoteMode() ? 'Tes données sont sauvegardées sur ton compte.' : 'Tes données restent sur cet appareil.'}</div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: CONTAINER.desktop, margin: '0 auto', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Screens tab={tab} setTab={goTab} bp={bp} onLogout={handleLogout}
              editEpisodeId={editEpisodeId} onEditEpisode={openEditEpisode} onEditDone={closeLog}
              onShowHelp={() => setShowHelp(true)} ecouteSignal={ecouteSignal} />
          </div>
        </main>
        {showHelp && <Onboarding bp={bp} isModal onDone={() => setShowHelp(false)} />}
        <ConfirmDialog open={confirmLogout} title="Se déconnecter ?" message="Tu pourras te reconnecter avec ton nom et mot de passe." confirmLabel="Se déconnecter" onConfirm={doLogout} onCancel={() => setConfirmLogout(false)} danger />
      </div>
    )
  }

  // ---------- MOBILE & TABLETTE : barre de navigation en bas ----------
  const isTablet = bp === 'tablet'
  const navH = NAV_HEIGHT[bp]
  return (
    <div style={{
      minHeight: '100vh', background: 'transparent', fontFamily: font.family,
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isTablet ? '16px 24px' : '14px 16px',
        background: alpha(colors.green.pageBg, 85), /* pageBg + 85% alpha */
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: 'none',
        boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
        flexShrink: 0,
      }}>
        <button onClick={() => goTab('home')} style={{
          display: 'flex', alignItems: 'center', gap: isTablet ? 11 : 9,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Logo size={isTablet ? 32 : 28} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: isTablet ? 20 : 18, fontWeight: 600, color: colors.text.title, lineHeight: 1, letterSpacing: '-0.01em' }}>Pousse</div>
            <div style={{ fontSize: isTablet ? 12 : 12, color: colors.text.faint, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 2 }}>jour après jour</div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ThemeToggle />
        {accountName && (
          <button onClick={() => goTab('profile')} style={{
            display: 'flex', alignItems: 'center', gap: 7, minHeight: 44,
            background: colors.green.surface, borderRadius: radius.pill,
            padding: '5px 12px 5px 5px', fontSize: 12, color: colors.text.muted,
            boxShadow: shadow.sm, border: `0.5px solid ${colors.border.soft}`,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.green.leaf}, ${colors.green.primary})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-user" style={{ fontSize: 12, color: colors.onPrimary }} aria-hidden="true" />
            </div>
            <span style={{ fontWeight: 500 }}>{accountName}</span>
          </button>
        )}
        </div>
      </header>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: isTablet ? '16px 24px 0' : '12px 12px 0',
        paddingBottom: navH + 24,
        maxWidth: CONTAINER[bp], width: '100%', margin: '0 auto',
      }}>
        <Screens tab={tab} setTab={goTab} bp={bp} onLogout={handleLogout}
          editEpisodeId={editEpisodeId} onEditEpisode={openEditEpisode} onEditDone={closeLog}
          onShowHelp={() => setShowHelp(true)} ecouteSignal={ecouteSignal} />
      </div>

      {showHelp && <Onboarding bp={bp} isModal onDone={() => setShowHelp(false)} />}
      <ConfirmDialog open={confirmLogout} title="Se déconnecter ?" message="Tu pourras te reconnecter avec ton nom et mot de passe." confirmLabel="Se déconnecter" onConfirm={doLogout} onCancel={() => setConfirmLogout(false)} danger />

      {/* Fondu doux entre le contenu et la barre de navigation */}
      <div className="no-print" style={{
        position: 'fixed', bottom: navH, left: 0, right: 0, height: 20,
        background: `linear-gradient(to bottom, transparent, ${alpha(colors.green.surface, 50)})`,
        pointerEvents: 'none', zIndex: 50,
      }} />

      <nav className="no-print" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: alpha(colors.green.surface, 92),
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: 'none',
        display: 'flex', justifyContent: 'center', gap: 2, padding: '6px 8px env(safe-area-inset-bottom, 10px)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: 520 }}>
          {TABS.map((t) => {
            const active = tab === t.id
            // Bouton central « Noter » : action principale, surélevée
            if (t.id === 'log') {
              return (
                <button key={t.id} onClick={() => goTab(t.id)} aria-label="Noter un épisode"
                  style={{
                    flex: 1, maxWidth: 90, border: 'none', background: 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    color: colors.green.primaryDark, fontWeight: 600, fontSize: 12,
                    padding: '0 4px 6px', fontFamily: 'inherit', position: 'relative',
                  }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%', marginTop: -26,
                    background: active ? colors.green.primaryDark : colors.green.primary,
                    border: `4px solid ${colors.green.surface}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: shadow.button, transition: 'background .2s ease',
                  }}>
                    <i className="ti ti-plus" style={{ fontSize: 24, color: colors.onPrimary }} aria-hidden="true" />
                  </div>
                  {t.label}
                </button>
              )
            }
            const showBadge = t.id === 'home' && pendingEfficacyCount > 0 && tab !== 'home'
            return (
              <button key={t.id} onClick={() => goTab(t.id)} aria-current={active ? 'page' : undefined}
                aria-label={showBadge ? `${t.label} (${pendingEfficacyCount} traitement${pendingEfficacyCount > 1 ? 's' : ''} à évaluer)` : undefined}
                style={{
                  flex: 1, maxWidth: 90, border: 'none', background: 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  color: active ? colors.text.title : colors.text.muted,
                  fontWeight: active ? 700 : 500, fontSize: 12, padding: '6px 4px', minHeight: 48,
                  borderRadius: 14,
                  fontFamily: 'inherit', position: 'relative',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 14,
                  background: active ? colors.green.soft : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .2s ease',
                  position: 'relative',
                }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} aria-hidden="true" />
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      minWidth: 20, height: 20, borderRadius: 999,
                      background: colors.coral.barStrong, color: colors.onPrimary,
                      fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: `2px solid ${colors.green.surface}`,
                    }}>{pendingEfficacyCount}</span>
                  )}
                </div>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function AppWithStore({ session, bp, isDesktop, onLogout }) {
  const toast = useToast()
  const onStorageError = useCallback(() => {
    toast('Espace de stockage insuffisant. Tes données n\'ont pas pu être sauvegardées.', 'error', 5000)
  }, [toast])

  return (
    <StoreProvider key={session.accountId} onStorageError={onStorageError}>
      <AppInner
        bp={bp}
        isDesktop={isDesktop}
        accountName={currentAccountName()}
        onLogout={onLogout}
      />
    </StoreProvider>
  )
}

// --- Splash screen animé ---
function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('growing') // growing → fading → done
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 2000)
    const t2 = setTimeout(() => onDone(), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: `linear-gradient(160deg, ${colors.green.pageBg} 0%, ${colors.green.bg} 50%, ${colors.green.soft} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 'fading' ? 0 : 1,
      transition: 'opacity .6s ease',
    }}>
      <div style={{ marginBottom: 24 }}>
        <Logo size={80} />
      </div>
      <div className="anim-fadeInUp anim-d4" style={{
        fontFamily: font.display, fontStyle: 'italic', fontSize: 32, fontWeight: 600,
        color: colors.text.title, letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        Pousse
      </div>
      <div className="anim-fadeInUp anim-d6" style={{
        fontSize: 12, color: colors.text.faint, letterSpacing: '1.5px',
        textTransform: 'uppercase', marginTop: 8,
      }}>
        jour après jour
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(() => {
    migrateIfNeeded()
    seedTestAccount()
    return getSession()
  })
  const [onboarded, setOnboarded] = useState(() => isOnboarded(getSession()?.accountId))
  // Animation de chargement à chaque ouverture ou actualisation de la page,
  // et à chaque connexion.
  const [showSplash, setShowSplash] = useState(true)
  const { bp, isDesktop } = useBreakpoint()

  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
  }, [])

  const [authNotice, setAuthNotice] = useState('')
  // Lien « mot de passe oublié » reçu par e-mail : ?reset=…
  const [resetToken, setResetToken] = useState(() => (isRemoteMode() ? new URLSearchParams(window.location.search).get('reset') : null))

  // Sauvegarde en ligne : synchronisation automatique tant que la session est ouverte
  useEffect(() => {
    // Pas de synchronisation tant que l'accord sur les données de santé manque
    if (!session?.remote || session.consentRequired) return undefined
    startSync()
    const onExpired = () => {
      clearSession()
      setSession(null)
      setAuthNotice('Ta session a expiré. Reconnecte-toi : tes modifications en attente seront envoyées.')
    }
    // Le serveur refuse la synchronisation : compte sans accord valide (créé avant la v11)
    const onConsentRequired = () => {
      setConsentRequired(true)
      setSession(getSession())
    }
    window.addEventListener('pousse:session-expired', onExpired)
    window.addEventListener('pousse:consent-required', onConsentRequired)
    return () => {
      window.removeEventListener('pousse:session-expired', onExpired)
      window.removeEventListener('pousse:consent-required', onConsentRequired)
      stopSync()
    }
  }, [session])

  const handleAuthenticated = useCallback(() => {
    setAuthNotice('')
    const s = getSession()
    setSession(s)
    setOnboarded(isOnboarded(s?.accountId))
    setShowSplash(true)
  }, [])

  if (resetToken) {
    return (
      <Auth bp={bp} onAuthenticated={handleAuthenticated} resetToken={resetToken}
        onResetDone={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setResetToken(null)
          // Toutes les sessions ont été révoquées par le serveur
          clearSession(); setSession(null)
          setAuthNotice('Mot de passe modifié. Tu peux te connecter avec le nouveau.')
        }} />
    )
  }

  if (showSplash && session) {
    return <SplashScreen onDone={handleSplashDone} />
  }

  if (!session) {
    return <Auth bp={bp} onAuthenticated={handleAuthenticated} notice={authNotice} />
  }

  if (session.remote && session.consentRequired) {
    return (
      <Consent bp={bp} name={session.name}
        onAccepted={() => setSession(getSession())}
        onLogout={async () => { await stopRemindersOnLogout(); logout(); setSession(null) }} />
    )
  }

  if (!onboarded) {
    return <Onboarding bp={bp} onDone={() => setOnboarded(true)} />
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppWithStore
          session={session}
          bp={bp}
          isDesktop={isDesktop}
          onLogout={async () => { await stopRemindersOnLogout(); logout(); setSession(null) }}
        />
      </ToastProvider>
    </ErrorBoundary>
  )
}
