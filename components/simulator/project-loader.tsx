"use client"

import { useEffect, useRef } from "react"
import { getProject, type SimulatorProject } from "@/lib/simulator/firmware/projects"

/**
 * Reads `?project=<id>` (or the older `?demo=<id>` alias) from the page URL
 * once on mount and, if it matches a known pre-built project, requests it
 * be loaded — the same path the toolbar's "Projects" menu uses. This is
 * what makes links like `simulator.solderhub.com?project=blink` from an
 * article's "Try this live" button drop the reader straight into that
 * circuit instead of a blank canvas.
 *
 * Deliberately reads window.location.search directly instead of Next's
 * useSearchParams — this is a single full-screen client app, not a page
 * that needs SSR-aware routing, so a plain browser API keeps this simple
 * and avoids a Suspense boundary requirement for no real benefit.
 */
export function ProjectLoader({
  onRequestProject,
  onUnknownProject,
}: {
  onRequestProject: (project: SimulatorProject) => void
  onUnknownProject?: (id: string) => void
}) {
  const triedRef = useRef(false)

  useEffect(() => {
    if (triedRef.current) return
    triedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const id = params.get("project") ?? params.get("demo")
    if (!id) return

    const project = getProject(id)
    if (project) {
      onRequestProject(project)
    } else {
      onUnknownProject?.(id)
    }
    // Intentionally run once — this only ever reflects the URL the page
    // loaded with, not later client-side state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
