"use client"

import { useState } from "react"
import { UserCircle2 } from "lucide-react"
import { useSolderHubSession } from "@/hooks/use-solderhub-session"

/**
 * Shows the signed-in SolderHub user (avatar + name) if this simulator
 * instance is wired to the main site (NEXT_PUBLIC_SOLDERHUB_URL), otherwise
 * a plain "Sign in" link. Degrades silently to signed-out — never blocks
 * or errors.
 */
export function UserBadge() {
  const { user, loading, signInUrl } = useSolderHubSession()
  const [imgFailed, setImgFailed] = useState(false)

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

  const showImage = Boolean(user.avatar_url) && !imgFailed

  return (
    <a
      href="https://solderhub.com"
      className="flex items-center gap-2 text-xs font-medium text-foreground transition-opacity hover:opacity-80"
      title={user.email}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external
        // avatar from solderhub.com, not a local/optimizable asset
        <img
          src={user.avatar_url!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="size-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <UserCircle2 className="size-6 shrink-0 text-muted-foreground" />
      )}
      <span className="hidden sm:inline">{user.full_name ?? user.email}</span>
    </a>
  )
}
