"use client"

import { useEffect, useState } from "react"

// Optional integration with the main SolderHub site's login session.
// Unset in local/fork development on purpose — no NEXT_PUBLIC_SOLDERHUB_URL
// means this hook makes no network calls at all and the app behaves as a
// fully standalone, sign-out-only tool (see README).
const SOLDERHUB_URL = process.env.NEXT_PUBLIC_SOLDERHUB_URL

export interface SolderHubUser {
  name?: string
  email?: string
  avatar_url?: string
}

interface SolderHubSession {
  user: SolderHubUser | null
  loading: boolean
  signInUrl: string
}

export function useSolderHubSession(): SolderHubSession {
  const [user, setUser] = useState<SolderHubUser | null>(null)
  const [loading, setLoading] = useState(Boolean(SOLDERHUB_URL))

  useEffect(() => {
    if (!SOLDERHUB_URL) return

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    fetch(`${SOLDERHUB_URL}/api/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SolderHubUser | null) => setUser(data))
      // Any failure — CORS, offline, 401, backend down — just means "not
      // signed in" here. This must never surface as an error to the user.
      .catch(() => setUser(null))
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return {
    user,
    loading,
    signInUrl: `${SOLDERHUB_URL ?? "https://solderhub.com"}/login?from=simulator`,
  }
}
