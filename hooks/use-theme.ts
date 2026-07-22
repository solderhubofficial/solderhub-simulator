"use client"

import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "solderhub-theme"

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  // layout.tsx runs an inline script before hydration that already applies
  // this class, so reading it back here keeps client state in sync without
  // a flash.
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Storage can be unavailable (private browsing) — theme still works
      // for the session, it just won't persist.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }, [])

  return { theme, toggleTheme }
}
