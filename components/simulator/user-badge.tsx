"use client"

import { LogIn } from "lucide-react"
import { useSolderHubSession } from "@/hooks/use-solderhub-session"
import { cn } from "@/lib/utils"

export function UserBadge() {
  const { user, loading, signInUrl } = useSolderHubSession()

  if (loading) {
    return <div className="size-8 shrink-0 rounded-full bg-muted animate-pulse" />
  }

  if (!user) {
    return (
      <a
        href={signInUrl}
        title="Sign in to SolderHub"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          "border border-border/60 text-muted-foreground transition-colors",
          "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
        )}
      >
        <LogIn className="size-3.5" />
      </a>
    )
  }

  const displayName = user.full_name ?? user.email
  const initial = displayName?.trim().charAt(0).toUpperCase() || "?"

  return (
    <span
      title={displayName}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary ring-1 ring-primary/20"
    >
      {initial}
    </span>
  )
}
