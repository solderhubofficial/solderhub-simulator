"use client"

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { FolderOpen, RefreshCw, Search, X } from "lucide-react"
import { ProjectThumbnail } from "@/components/simulator/project-thumbnail"
import { BOARD_FAMILIES, boardTypeOf, familyOfType, type BoardFamily } from "@/lib/simulator/project-board"
import { cn } from "@/lib/utils"

const API = "/api/saved-project?visibility=public"
const CACHE_KEY = "simulator:public-projects:v1"
const CACHE_TTL_MS = 10 * 60 * 1000
const PAGE_SIZE = 18

type PublicProject = {
  id: string
  name: string
  description?: string | null
  updated_at?: string
  firmware_target: string | null
  thumbnail_url?: string | null
  circuit_data?: { components?: unknown[]; wires?: unknown[] } | null
}

type ProjectCard = { id: string; name: string; family: BoardFamily; boardType: string | null; imageUrl: string | null; components: unknown; wires: unknown; updated: number }

// Module-level cache: survives closing/reopening the panel without refetching.
let memoryCache: { at: number; cards: ProjectCard[] } | null = null
let inflight: Promise<ProjectCard[]> | null = null

function toCard(project: PublicProject): ProjectCard {
  const components = project.circuit_data?.components
  const boardType = boardTypeOf(components, project.firmware_target)
  return {
    id: project.id,
    name: project.name,
    family: familyOfType(boardType),
    boardType,
    imageUrl: project.thumbnail_url ?? null,
    components,
    wires: project.circuit_data?.wires,
    updated: project.updated_at ? Date.parse(project.updated_at) || 0 : 0,
  }
}

function readSessionCache(): typeof memoryCache {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; projects: PublicProject[] }
    return { at: parsed.at, cards: parsed.projects.map(toCard) }
  } catch { return null }
}

function writeSessionCache(projects: PublicProject[]) {
  // Store light metadata only -- circuit data can be large.
  const light = projects.map(({ circuit_data, ...rest }) => ({ ...rest, circuit_data: circuit_data ? { components: circuit_data.components?.slice(0, 40), wires: circuit_data.wires?.slice(0, 120) } : null }))
  try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), projects: light })) } catch { /* quota or private mode */ }
}

function loadProjects(): Promise<ProjectCard[]> {
  if (inflight) return inflight
  inflight = (async () => {
    const response = await fetch(API)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Couldn't load public projects.")
    const projects: PublicProject[] = Array.isArray(data.projects) ? data.projects : []
    const cards = projects.map(toCard).sort((a, b) => b.updated - a.updated)
    memoryCache = { at: Date.now(), cards }
    writeSessionCache(projects)
    return cards
  })().finally(() => { inflight = null })
  return inflight
}

const Card = memo(function Card({ card }: { card: ProjectCard }) {
  return (
    <a
      href={`/?saved=${encodeURIComponent(card.id)}`}
      className="group flex flex-col gap-2 rounded-xl border border-border/80 bg-background/50 p-2 transition-all [content-visibility:auto] [contain-intrinsic-size:auto_170px] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-black/5 focus-visible:border-primary focus-visible:outline-none"
    >
      <ProjectThumbnail family={card.family} boardType={card.boardType} imageUrl={card.imageUrl} components={card.components} wires={card.wires} />
      <span className="line-clamp-2 px-1 pb-0.5 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary">{card.name}</span>
    </a>
  )
})

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading public projects">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-border/60 p-2">
          <div className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
          <div className="mx-1 mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function PublicProjectsPanel() {
  const [open, setOpen] = useState(false)
  const [cards, setCards] = useState<ProjectCard[]>(() => memoryCache?.cards ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [family, setFamily] = useState<BoardFamily | "all">("all")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const deferredQuery = useDeferredValue(query)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // Stale-while-revalidate: show cached cards at once, refresh quietly behind them.
  const refresh = useCallback(async (force = false) => {
    if (!memoryCache) memoryCache = readSessionCache()
    if (memoryCache && mounted.current) setCards(memoryCache.cards)
    const fresh = memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS
    if (fresh && !force) return
    setLoading(!memoryCache || force)
    setError(null)
    try {
      const next = await loadProjects()
      if (mounted.current) setCards(next)
    } catch (reason) {
      if (mounted.current && !memoryCache) setError(reason instanceof Error ? reason.message : "Couldn't connect to the project library.")
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  // Warm the cache while the browser is idle so the first open is instant.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const handle = idle ? idle(() => void refresh()) : window.setTimeout(() => void refresh(), 2500)
    return () => { if (!idle) window.clearTimeout(handle) }
  }, [refresh])

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener("simulator:open-public-projects", show)
    return () => window.removeEventListener("simulator:open-public-projects", show)
  }, [])

  useEffect(() => { if (open) void refresh() }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => { setLimit(PAGE_SIZE) }, [family, deferredQuery])

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: cards.length }
    for (const card of cards) result[card.family] = (result[card.family] ?? 0) + 1
    return result
  }, [cards])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return cards.filter((card) => (family === "all" || card.family === family) && (!q || card.name.toLowerCase().includes(q)))
  }, [cards, family, deferredQuery])

  if (!open) return null
  const visible = filtered.slice(0, limit)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="public-projects-title" className="flex max-h-[min(90dvh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><FolderOpen className="size-4" /></div>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">SolderHub cloud / 01</p>
              <h2 id="public-projects-title" className="text-base font-bold tracking-tight">Public Projects</h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void refresh(true)} disabled={loading} title="Refresh" aria-label="Refresh projects" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close public projects" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
          </div>
        </header>

        <div className="space-y-2.5 border-b border-border/80 p-3 sm:px-4">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:border-primary">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects…" aria-label="Search public projects" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
          </label>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by board">
            {BOARD_FAMILIES.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={family === item.id} onClick={() => setFamily(item.id)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  family === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                {item.label}
                <span className={cn("font-mono text-[10px]", family === item.id ? "opacity-80" : "opacity-60")}>{counts[item.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sim-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {error ? (
            <div className="rounded-xl border border-destructive/25 p-4 text-sm text-destructive"><p>{error}</p><button type="button" onClick={() => void refresh(true)} className="mt-3 inline-flex items-center gap-2 underline"><RefreshCw className="size-3.5" /> Try again</button></div>
          ) : cards.length === 0 && loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <FolderOpen className="mx-auto size-7 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-semibold">{cards.length === 0 ? "No public projects yet" : "No projects match"}</p>
              {(query || family !== "all") && <button type="button" onClick={() => { setQuery(""); setFamily("all") }} className="mt-3 text-xs font-semibold text-primary underline underline-offset-4">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visible.map((card) => <Card key={card.id} card={card} />)}</div>
              {filtered.length > visible.length && (
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:border-primary/50 hover:text-primary">Show more ({filtered.length - visible.length})</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
