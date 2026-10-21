"use client"

import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"
export type ThemePreference = "system" | "light" | "dark"

const STORAGE_KEY = "solderhub-theme"

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : "system"
  } catch {
    return "system"
  }
}

function systemIsDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * Theme preference: "system" follows the OS (and live-updates when it changes); "light" / "dark" pin it.
 * The first render is always "system"/"light" so it matches the server HTML; the inline script in layout.tsx
 * has already put the right class on <html>, so nothing flashes.
 */
export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system")
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => { setPreferenceState(readPreference()) }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = preference === "dark" || (preference === "system" && systemIsDark())
      document.documentElement.classList.toggle("dark", dark)
      setTheme(dark ? "dark" : "light")
    }
    apply()
    if (preference !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private browsing) — the choice still applies for this session.
    }
  }, [])

  const toggleTheme = useCallback(() => setPreference(theme === "dark" ? "light" : "dark"), [setPreference, theme])

  return { theme, preference, setPreference, toggleTheme }
}
