import { registerCustomConditions } from './conditions'
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import {
  loadEpisodes, saveEpisode as persistEpisode, updateEpisode as persistUpdate,
  deleteEpisode as persistDelete, loadProfile, saveProfile as persistProfile,
  loadShortcuts, saveShortcut as persistShortcut, removeShortcut as persistRemoveShortcut,
  loadCycleLogs, saveCycleLog as persistCycleLog,
} from './storage'

const StoreContext = createContext(null)

export function StoreProvider({ children, onStorageError }) {
  const [episodes, setEpisodes] = useState(() => loadEpisodes())
  const [profile, setProfile] = useState(() => loadProfile())
  // Pathologies personnelles : enregistrées dans le registre partagé avant l'affichage des écrans
  registerCustomConditions(profile.customConditions)
  const [shortcuts, setShortcuts] = useState(() => loadShortcuts())
  const [cycleLogs, setCycleLogs] = useState(() => loadCycleLogs())
  const errorCb = useRef(onStorageError)
  errorCb.current = onStorageError

  // Données reçues d'un autre appareil : on relit le stockage local
  useEffect(() => {
    const reload = () => {
      setEpisodes(loadEpisodes())
      setProfile(loadProfile())
      setShortcuts(loadShortcuts())
      setCycleLogs(loadCycleLogs())
    }
    window.addEventListener('pousse:data-synced', reload)
    return () => window.removeEventListener('pousse:data-synced', reload)
  }, [])

  const notifyError = useCallback(() => {
    if (errorCb.current) errorCb.current()
  }, [])

  const addEpisode = useCallback((episode) => {
    try {
      const saved = persistEpisode(episode)
      setEpisodes((prev) => [...prev, saved])
      return saved
    } catch {
      notifyError()
      return null
    }
  }, [notifyError])

  const editEpisode = useCallback((id, patch) => {
    try {
      persistUpdate(id, patch)
      setEpisodes((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
    } catch {
      notifyError()
    }
  }, [notifyError])

  const removeEpisode = useCallback((id) => {
    persistDelete(id)
    setEpisodes((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch }
      try {
        persistProfile(next)
      } catch {
        notifyError()
      }
      return next
    })
  }, [notifyError])

  const addShortcut = useCallback((shortcut) => {
    const saved = persistShortcut(shortcut)
    setShortcuts((prev) => [...prev, saved])
    return saved
  }, [])

  const removeShortcut = useCallback((id) => {
    persistRemoveShortcut(id)
    setShortcuts((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const addCycleLog = useCallback((log) => {
    const saved = persistCycleLog(log)
    setCycleLogs((prev) => {
      const idx = prev.findIndex((l) => l.day === saved.day)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    return saved
  }, [])

  return (
    <StoreContext.Provider value={{ episodes, addEpisode, editEpisode, removeEpisode, profile, updateProfile, shortcuts, addShortcut, removeShortcut, cycleLogs, addCycleLog }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider')
  return ctx
}
