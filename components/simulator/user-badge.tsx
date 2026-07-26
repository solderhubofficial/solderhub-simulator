"use client"

import { LogIn } from "lucide-react"
import { useSolderHubSession } from "@/hooks/use-solderhub-session"

/**
 * Icon-only version of the sign-in status. Signed-in users get a small
 * initial avatar (name/email still available on hover via title); signed-
 * out users get a plain sign-in icon. Degrades silently to signed-out —
 * never blocks or errors.
 */
export function UserBadge() {
  const { user, loading, signInUrl } = useSolderHubSession()

  if (loading) return null

  if (!user) {
    return (
      <a
        href={signInUrl}
        title="Sign in"
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogIn className="size-4" />
      </a>
    )
  }

  const displayName = user.full_name ?? user.email
  const initial = displayName?.trim().charAt(0).toUpperCase() || "?"

  return (
    <span
      title={displayName}
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
    >
      {initial}
    </span>
  )
}
