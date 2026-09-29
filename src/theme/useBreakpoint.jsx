import { useState, useEffect } from 'react'

// =============================================================
// useBreakpoint — détecte la classe d'appareil pour adapter la mise en page.
// mobile  : < 640px   (téléphone, navigation en bas)
// tablet  : 640–1023px (contenu plus large, navigation en bas)
// desktop : ≥ 1024px   (navigation latérale, contenu large)
// =============================================================

export const BREAKPOINTS = { tablet: 640, desktop: 1024 }

export function useBreakpoint() {
  const get = () => {
    if (typeof window === 'undefined') return 'mobile'
    const w = window.innerWidth
    if (w >= BREAKPOINTS.desktop) return 'desktop'
    if (w >= BREAKPOINTS.tablet) return 'tablet'
    return 'mobile'
  }

  const [bp, setBp] = useState(get)

  useEffect(() => {
    let frame
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setBp(get()))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
    }
  }, [])

  return {
    bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
  }
}
