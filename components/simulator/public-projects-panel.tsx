"use client"

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownAZ, ArrowDownWideNarrow, CalendarClock, Check, CircuitBoard, Cpu, FolderOpen, Play, Eye, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react"
import { ProjectThumbnail } from "@/components/simulator/project-thumbnail"
import { getBoardSupport } from "@/lib/simulator/board-support"
import { BOARD_FAMILIES, boardTypeOf, familyOfType, type BoardFamily } from "@/lib/simulator/project-board"
import { cn } from "@/lib/utils"

const API = "/api/saved-project?visibility=public"
const CACHE_KEY = "simulator:public-projects:v1"
const CACHE_TTL_MS = 10 * 60 * 1000
const PAGE_SIZE = 24

type PublicProject = {
  id: string
  name: string
  description?: string | null
  updated_at?: string
  firmware_target: string | null
  thumbnail_url?: string | null
  circuit_data?: { components?: unknown[]; wires?: unknown[] } | null
}

export type ProjectCard = {
  id: string
  name: string
  description: string
  family: BoardFamily
  boardType: string | null
  imageUrl: string | null
  components: unknown
  wires: unknown
  componentCount: number
  wireCount: number
  updated: number
}

// Module-level cache: survives closing/reopening the panel without refetching.
let memoryCache: { at: number; cards: ProjectCard[] } | null = null
let inflight: Promise<ProjectCard[]> | null = null

function toCard(project: PublicProject): ProjectCard {
  const components = project.circuit_data?.components
  const wires = project.circuit_data?.wires
  const boardType = boardTypeOf(components, project.firmware_target)
  return {
    id: project.id,
    name: project.name,
    description: project.description?.trim() ?? "",
    family: familyOfType(boardType),
    boardType,
    imageUrl: project.thumbnail_url ?? null,
    components,
    wires,
    componentCount: Array.isArray(components) ? components.length : 0,
    wireCount: Array.isArray(wires) ? wires.length : 0,
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
  const light = projects.map(({ circuit_data, ...rest }) => ({
    ...rest,
    circuit_data: circuit_data ? { components: circuit_data.components?.slice(0, 40), wires: circuit_data.wires?.slice(0, 120) } : null,
  }))
  try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), projects: light })) } catch { /* quota or private mode */ }
}

export function loadProjects(): Promise<ProjectCard[]> {
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

export function boardLabel(card: ProjectCard) {
  if (card.boardType) {
    const type = card.boardType.toLowerCase()
    if (type.includes("arduino-uno") || type === "uno") return "Arduino Uno"
    if (type.includes("mega")) return "Arduino Mega"
    if (type.includes("nano")) return "Arduino Nano"
    if (type.includes("esp32")) return "ESP32"
    if (type.includes("nodemcu")) return "NodeMCU"
    if (type.includes("pico")) return "Raspberry Pi Pico"
    if (type.includes("stm32") || type.includes("pill")) return "STM32"
    return card.boardType.replace(/[-_]/g, " ")
  }
  return "Circuit project"
}

function updatedLabel(timestamp: number) {
  if (!timestamp) return "Community project"
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
  if (days === 0) return "Updated today"
  if (days === 1) return "Updated yesterday"
  if (days < 30) return `Updated ${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

const Card = memo(function Card({ card }: { card: ProjectCard }) {
  const support = getBoardSupport(card.boardType)?.support ?? null
  const summary = card.description || (card.componentCount ? `A ${boardLabel(card)} build with ${card.componentCount} part${card.componentCount === 1 ? "" : "s"}.` : "Open this circuit in the simulator and explore how it is wired.")
  return (
    <a
      href={`/?saved=${encodeURIComponent(card.id)}`}
      aria-label={`Open example: ${card.name}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [content-visibility:auto] [contain-intrinsic-size:auto_300px]"
    >
      <div className="relative bg-muted/40 p-2">
        <ProjectThumbnail family={card.family} boardType={card.boardType} imageUrl={card.imageUrl} components={card.components} wires={card.wires} />
        <span className="absolute left-3.5 top-3.5 inline-flex max-w-[60%] items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-md">
          <Cpu className="size-3 shrink-0 text-primary" />
          <span className="truncate">{boardLabel(card)}</span>
        </span>
        {support && (
          <span className={cn(
            "absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-md",
            support === "runtime"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
          )}>
            {support === "runtime" ? <Play className="size-3" /> : <Eye className="size-3" />}
            {support === "runtime" ? "Runs" : "Preview only"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">{card.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{summary}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CircuitBoard className="size-3.5 shrink-0" />{card.componentCount} parts</span>
            <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5 shrink-0" />{updatedLabel(card.updated).replace("Updated ", "")}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">Open <span aria-hidden="true">→</span></span>
        </div>
      </div>
    </a>
  )
})

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-busy="true" aria-label="Loading public projects">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/60 p-2.5">
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
          <div className="mx-1 mt-3 h-3 w-4/5 animate-pulse rounded bg-muted" />
          <div className="mx-1 mt-2 h-3 w-3/5 animate-pulse rounded bg-muted/70" />
          <div className="mx-1 mt-4 h-3 w-2/5 animate-pulse rounded bg-muted/60" />
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
  const [sort, setSort] = useState<"recent" | "name">("recent")
  const [runsOnly, setRunsOnly] = useState(false)
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

  useEffect(() => { setLimit(PAGE_SIZE) }, [family, deferredQuery, sort, runsOnly])

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: cards.length }
    for (const card of cards) result[card.family] = (result[card.family] ?? 0) + 1
    return result
  }, [cards])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    const result = cards.filter((card) =>
      (family === "all" || card.family === family) &&
      (!runsOnly || getBoardSupport(card.boardType)?.support === "runtime") &&
      (!q || `${card.name} ${card.description} ${boardLabel(card)}`.toLowerCase().includes(q))
    )
    return result.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.updated - a.updated)
  }, [cards, family, deferredQuery, sort, runsOnly])

  if (!open) return null
  const visible = filtered.slice(0, limit)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-2 backdrop-blur-md sm:p-4 lg:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="public-projects-title" className="flex max-h-[min(96dvh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-[0_28px_100px_-24px_rgba(0,0,0,0.55)] sm:rounded-3xl">
        <header className="relative isolate overflow-hidden border-b border-border/70 bg-card">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(0,0,0,0),transparent_48%)]" />
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 sm:px-5 sm:pb-3.5 sm:pt-3.5">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:size-12">
                <FolderOpen className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">SolderHub Simulator</p>
                  <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Community library</span>
                </div>
                <h2 id="public-projects-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Examples<span className="text-primary">.</span></h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">Pick a working circuit, open it in the simulator and change it. "Runs" means your code compiles and runs; "Preview only" examples show a finished circuit.</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
                  <span className="inline-flex items-center gap-1.5"><CircuitBoard className="size-3.5 text-primary" /> <strong className="text-foreground">{cards.length}</strong> examples</span>
                  <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary" /> Opens in one click</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => void refresh(true)} disabled={loading} title="Refresh project library" aria-label="Refresh projects" className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"><RefreshCw className={cn("size-4", loading && "animate-spin")} /></button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close public projects" className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-10 space-y-3 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 transition focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/10">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by project, sensor, or board…" aria-label="Search public projects" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/80" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-3.5" /></button>}
              <kbd className="hidden rounded-md border border-border bg-muted/70 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground md:inline">SEARCH</kbd>
            </label>
            <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground sm:w-56">
              {sort === "recent" ? <CalendarClock className="size-4 shrink-0" /> : <ArrowDownAZ className="size-4 shrink-0" />}
              <span className="sr-only">Sort projects</span>
              <select aria-label="Sort projects" value={sort} onChange={(event) => setSort(event.target.value as "recent" | "name")} className="min-w-0 flex-1 bg-transparent font-semibold text-foreground outline-none">
                <option value="recent">Recently updated</option>
                <option value="name">Name A–Z</option>
              </select>
              <SlidersHorizontal className="size-3.5 shrink-0 opacity-50" />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline-flex"><SlidersHorizontal className="size-3.5" /> Board</span>
            <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Filter by board">
              {BOARD_FAMILIES.map((item) => {
                const selected = family === item.id
                return (
                  <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => setFamily(item.id)}
                    className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition duration-150",
                      selected ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
                    {selected && <Check className="size-3" />}
                    {item.label}
                    <span className={cn("rounded-full px-1.5 py-0.5 font-mono text-[9px]", selected ? "bg-primary-foreground/15" : "bg-muted")}>{counts[item.id] ?? 0}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" aria-pressed={runsOnly} onClick={() => setRunsOnly((v) => !v)}
              className={cn("ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-semibold transition duration-150",
                runsOnly ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
              <Play className="size-3" /> Runs your code
            </button>
          </div>
        </div>

        <div className="sim-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3.5">
          {error ? (
            <div className="mx-auto max-w-md rounded-2xl border border-destructive/25 bg-destructive/[0.04] p-6 text-center text-sm text-destructive">
              <FolderOpen className="mx-auto size-7 opacity-70" /><p className="mt-3 font-semibold">Couldn't load the project library</p><p className="mt-1 text-xs opacity-80">{error}</p>
              <button type="button" onClick={() => void refresh(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold hover:bg-destructive/5"><RefreshCw className="size-3.5" /> Try again</button>
            </div>
          ) : cards.length === 0 && loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-4 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Search className="size-5" /></div>
              <p className="mt-4 text-sm font-bold">{cards.length === 0 ? "The library is waiting for its first project" : "No matching projects"}</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{cards.length === 0 ? "Public community circuits will appear here." : "Try another keyword or remove a board filter."}</p>
              {(query || family !== "all" || runsOnly) && <button type="button" onClick={() => { setQuery(""); setFamily("all"); setRunsOnly(false) }} className="mt-4 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary/40 hover:text-primary">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "example" : "examples"}{query.trim() ? " found" : ""}</p>
                <p className="text-[10px] text-muted-foreground">Showing {Math.min(visible.length, filtered.length)} of {filtered.length}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((card) => <Card key={card.id} card={card} />)}
              </div>
              {filtered.length > visible.length && (
                <div className="mt-6 flex flex-col items-center gap-2 pb-2">
                  <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-xs font-bold transition hover:border-primary/50 hover:bg-primary/[0.04] hover:text-primary">
                    <ArrowDownWideNarrow className="size-4" /> Load more projects <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{filtered.length - visible.length} left</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground">More circuits, more things to build.</p>
                </div>
              )}
            </>
          )}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-border/70 bg-card/70 px-4 py-2.5 sm:px-5">
          <span className="text-[10px] text-muted-foreground">Built to explore. Made to learn.</span>
          <span className="font-mono text-[9px] font-semibold tracking-wider text-muted-foreground/70">SOLDERHUB / PROJECTS</span>
        </footer>
      </section>
    </div>
  )
}
