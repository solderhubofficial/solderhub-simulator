"use client"

import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "solderhub-theme"

export function useTheme() {
  // Always start at "light" so the very first client render is byte-for-byte
  // identical to the server-rendered HTML (the server has no access to the
  // browser's stored/system preference). The inline script in layout.tsx
  // already set the correct .dark class on <html> before hydration, so the
  // page itself never flashes — only this hook's own state (used for things
  // like the toolbar's sun/moon icon) needs a post-mount sync, which avoids
  // the hydration mismatch entirely.
  const [theme, setTheme] = useState<Theme>("light")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Storage can be unavailable (private browsing) — theme still works
      // for the session, it just won't persist.
    }
  }, [theme, hydrated])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }, [])

  return { theme, toggleTheme }
}
