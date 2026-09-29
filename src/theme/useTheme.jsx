import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { palette } from './tokens'

// Thème de l'interface : « jour » (défaut) ou « nuit » (jardin de nuit).
// Le choix est mémorisé sur l'appareil, indépendamment du compte.
export const THEME_KEY = 'pousse.theme'
const THEMES = ['jour', 'nuit']

export function readStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return THEMES.includes(t) ? t : 'jour'
  } catch {
    return 'jour'
  }
}

// Applique le thème au document (utilisé aussi avant le premier rendu)
export function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', palette[theme]['green.pageBg'])
}

const ThemeContext = createContext({ theme: 'jour', setTheme: () => {}, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const setTheme = useCallback((t) => {
    if (!THEMES.includes(t)) return
    setThemeState(t)
    try { localStorage.setItem(THEME_KEY, t) } catch { /* stockage indisponible : thème non mémorisé */ }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'nuit' ? 'jour' : 'nuit')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
