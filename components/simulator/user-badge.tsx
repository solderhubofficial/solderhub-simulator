"use client"

import { useSolderHubSession } from "@/hooks/use-solderhub-session"

/**
 * Shows the signed-in SolderHub user if this simulator instance is wired to
 * the main site (NEXT_PUBLIC_SOLDERHUB_URL), otherwise a plain "Sign in"
 * link. Degrades silently to signed-out — never blocks or errors.
 */
export function UserBadge() {
  const { user, loading, signInUrl } = useSolderHubSession()

  if (loading) return null

  if (!user) {
    return (
      <a
        href={signInUrl}
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </a>
    )
  }

  return (
    <span className="text-xs font-medium text-foreground" title={user.email}>
      {user.name ?? user.email}
    </span>
  )
}
