"use client"

import { useCallback, useSyncExternalStore } from "react"

/** What the person picked. "system" follows the OS and updates live. */
export type ThemePreference = "system" | "light" | "dark"
/** What is actually applied to the page. */
export type Theme = "light" | "dark"

const STORAGE_KEY = "solderhub-theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"

interface Snapshot {
  preference: ThemePreference
  theme: Theme
}

// One shared store so every component calling useTheme() stays in sync
// (toolbar, start screen, code editor...). Server and the first client render
// both see the same snapshot, so hydration never mismatches; the inline
// script in layout.tsx has already put the right class on <html> by then.
const SERVER_SNAPSHOT: Snapshot = { preference: "system", theme: "light" }
let snapshot: Snapshot = SERVER_SNAPSHOT
let initialised = false
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // Storage can be unavailable (private browsing) — fall through to system.
  }
  return "system"
}

function resolve(preference: ThemePreference): Theme {
  if (preference === "system") return window.matchMedia(DARK_QUERY).matches ? "dark" : "light"
  return preference
}

function apply(preference: ThemePreference) {
  const theme = resolve(preference)
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
  if (snapshot.preference !== preference || snapshot.theme !== theme) {
    snapshot = { preference, theme }
    listeners.forEach((listener) => listener())
  }
}

function init() {
  if (initialised || typeof window === "undefined") return
  initialised = true
  apply(readPreference())
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    if (snapshot.preference === "system") apply("system")
  })
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) apply(readPreference())
  })
}

function subscribe(listener: () => void) {
  init()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return snapshot
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

export function useTheme() {
  const { preference, theme } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Still applies for this session, it just won't persist.
    }
    apply(next)
  }, [])

  /** Flips the *visible* theme and pins it (kept for existing callers). */
  const toggleTheme = useCallback(() => {
    setPreference(snapshot.theme === "dark" ? "light" : "dark")
  }, [setPreference])

  return { theme, preference, setPreference, toggleTheme }
}
