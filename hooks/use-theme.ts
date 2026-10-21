"use client"

import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"
export type ThemeMode = Theme | "system"

const STORAGE_KEY = "solderhub-theme"

function resolveTheme(mode: ThemeMode): Theme {
  if (mode !== "system") return mode
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function useTheme() {
  // Keep the first render stable for hydration. The layout's inline script applies
  // the saved/system theme before paint; this hook syncs its state after mount.
  const [theme, setTheme] = useState<Theme>("light")
  const [mode, setModeState] = useState<ThemeMode>("system")
  const [hydrated, setHydrated] = useState(false)

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode)
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored)
        setTheme(resolveTheme(stored))
      } else {
        setTheme(resolveTheme("system"))
      }
    } catch {
      setTheme(resolveTheme("system"))
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const apply = () => {
      const nextTheme = resolveTheme(mode)
      document.documentElement.classList.toggle("dark", nextTheme === "dark")
      setTheme(nextTheme)
    }

    apply()
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Storage can be unavailable — the theme still works for this session.
    }

    if (mode !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => apply()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [mode, hydrated])

  const toggleTheme = useCallback(() => {
    setModeState((current) => {
      const resolved = resolveTheme(current)
      return resolved === "dark" ? "light" : "dark"
    })
  }, [])

  return { theme, mode, setMode, toggleTheme }
}
