"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Search, X, PanelLeftClose } from "lucide-react"
import { getPaletteItems } from "@/lib/simulator/registry"
import { ComponentThumbnail } from "@/components/simulator/component-thumbnail"
import { isPreviewBoard } from "@/lib/simulator/board-support"
import { cn } from "@/lib/utils"

const CATEGORY_LABELS: Record<string, string> = {
  board: "Boards",
  passive: "Passive",
  active: "Active",
  input: "Inputs",
  output: "Outputs",
}

const CATEGORY_ORDER = ["board", "input", "output", "passive", "active"]

const TOUCH_DRAG_THRESHOLD = 10

/** Shown first in the drawer, in this order, when it exists. */
const POPULAR_TYPES = ["led", "resistor", "push-button", "buzzer", "potentiometer", "lcd1602"]

interface ComponentsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ComponentsSidebar({ isOpen, onClose }: ComponentsSidebarProps) {
  const items = getPaletteItems()
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | "all">("all")

  const filtered = useMemo(() => {
    let result = items
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[item.category] ?? item.category).toLowerCase().includes(q),
      )
    }
    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory)
    }
    return result
  }, [items, query, activeCategory])

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category))
    return CATEGORY_ORDER.filter((c) => cats.has(c))
  }, [items])

  const grouped = filtered.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/simulator-component", type)
    e.dataTransfer.effectAllowed = "copy"
    suppressClickRef.current = true
  }, [])

  const touchDragRef = useRef<{
    type: string
    name: string
    startX: number
    startY: number
    active: boolean
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; label: string } | null>(null)
  const suppressClickRef = useRef(false)

  const handleDragEnd = useCallback(() => {
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 350)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent, type: string, name: string) => {
    if (e.pointerType !== "touch") return
    touchDragRef.current = { type, name, startX: e.clientX, startY: e.clientY, active: false }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = touchDragRef.current
    if (!drag) return
    if (!drag.active) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (dist < TOUCH_DRAG_THRESHOLD) return
      drag.active = true
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      // Close the drawer the moment a real drag starts (not on a plain tap)
      // so the canvas -- and wherever the component ends up -- is actually
      // visible while the user is still dragging, instead of staying
      // hidden behind the drawer/backdrop the whole time.
      onClose()
    }
    e.preventDefault()
    setDragPreview({ x: e.clientX, y: e.clientY, label: drag.name })
  }, [onClose])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const drag = touchDragRef.current
    touchDragRef.current = null
    setDragPreview(null)
    if (!drag?.active) return
    suppressClickRef.current = true
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 350)
    window.dispatchEvent(
      new CustomEvent("simulator:touch-drop", {
        detail: { type: drag.type, clientX: e.clientX, clientY: e.clientY },
      }),
    )
  }, [])

  const handlePaletteClick = useCallback((type: string) => {
    // A click adds a part everywhere; dragging is still available for precise placement.
    if (suppressClickRef.current) return
    window.dispatchEvent(new CustomEvent("simulator:add-component", { detail: { type } }))
    if (window.matchMedia("(pointer: coarse)").matches) onClose()
  }, [onClose])

  const popular = useMemo(
    () => POPULAR_TYPES.map((t) => items.find((i) => i.type === t)).filter((i): i is (typeof items)[number] => Boolean(i)),
    [items],
  )
  const showPopular = activeCategory === "all" && !query.trim()

  const dragProps = (item: { type: string; name: string }) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, item.type),
    onDragEnd: handleDragEnd,
    onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, item.type, item.name),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onClick: () => handlePaletteClick(item.type),
    title: `Drag ${item.name} to canvas, or tap to add`,
  })

  const renderCard = (item: (typeof items)[number], key: string) => (
    <div
      key={key}
      {...dragProps(item)}
      className="group flex min-w-0 cursor-grab touch-none flex-col items-center gap-1 rounded-lg border border-border bg-card px-1 py-2 text-center text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 active:cursor-grabbing"
    >
      <div className="h-12 w-full shrink-0"><ComponentThumbnail type={item.type} /></div>
      <span className="line-clamp-2 w-full break-words leading-tight">{item.name}</span>
    </div>
  )

  const renderBoard = (item: (typeof items)[number]) => (
    <div
      key={item.type}
      {...dragProps(item)}
      className="flex min-w-0 cursor-grab touch-none items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 active:cursor-grabbing"
    >
      <div className="flex size-8 shrink-0 items-center justify-center"><ComponentThumbnail type={item.type} /></div>
      <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
      {isPreviewBoard(item.type)
        ? <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400" title="Design and demo only: code can't be compiled or run on this board yet">Preview only</span>
        : <span className="shrink-0 text-xs font-medium text-status-running">Runs</span>}
    </div>
  )

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-16 left-0 right-0 top-[60px] z-30 bg-black/50 backdrop-blur-[1px] sm:bottom-11 sm:left-[72px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "sim-panel flex w-72 max-w-[88vw] shrink-0 flex-col border-r border-border",
          "fixed bottom-16 left-0 top-[60px] z-40 transition-[transform,width] duration-300 sm:bottom-11 sm:left-[72px] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] lg:static lg:bottom-auto lg:left-auto lg:top-auto lg:z-auto lg:overflow-hidden",
          isOpen
            ? "translate-x-0 lg:w-[304px] lg:translate-x-0"
            : "-translate-x-[calc(100%+3rem)] lg:w-0 lg:translate-x-0 lg:border-r-0",
        )}
      >
        {/* Search + filters */}
        <div className="px-3.5 pb-2.5 pt-3.5">
          <div className="flex items-center gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-primary/50">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search parts"
                aria-label="Search parts"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={onClose}
              aria-label="Collapse parts drawer"
              title="Collapse parts drawer"
              className="tap-pad flex size-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <CategoryTab label="All" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
            {categories.map((cat) => (
              <CategoryTab key={cat} label={CATEGORY_LABELS[cat] ?? cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
            ))}
          </div>
        </div>

        {/* Parts list */}
        <div className="sim-scrollbar flex-1 overflow-y-auto px-3.5 pb-4 pt-1">
          {Object.keys(grouped).length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">No parts match your search</p>
          )}
          {showPopular && popular.length > 0 && (
            <section>
              <SectionTitle>Popular</SectionTitle>
              <div className="grid grid-cols-3 gap-2">{popular.map((item) => renderCard(item, `pop-${item.type}`))}</div>
            </section>
          )}
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <section key={category}>
              {(activeCategory === "all" || showPopular) && <SectionTitle>{CATEGORY_LABELS[category] ?? category}</SectionTitle>}
              {category === "board" ? (
                <div className="space-y-2">{categoryItems.map((item) => renderBoard(item))}</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">{categoryItems.map((item) => renderCard(item, item.type))}</div>
              )}
            </section>
          ))}
        </div>
      </aside>

      {dragPreview && (
        <div
          className="pointer-events-none fixed z-[100] flex items-center gap-2 rounded-lg border border-primary/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xl"
          style={{ left: dragPreview.x + 12, top: dragPreview.y + 12 }}
        >
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          {dragPreview.label}
        </div>
      )}
    </>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground first:mt-2">{children}</h3>
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-muted/50 text-foreground/80 hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}
