"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Search, X, GripVertical, LayoutGrid } from "lucide-react"
import { getPaletteItems } from "@/lib/simulator/registry"
import { ComponentThumbnail } from "@/components/simulator/component-thumbnail"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  }, [])

  const touchDragRef = useRef<{
    type: string
    name: string
    startX: number
    startY: number
    active: boolean
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; label: string } | null>(null)

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
    window.dispatchEvent(
      new CustomEvent("simulator:touch-drop", {
        detail: { type: drag.type, clientX: e.clientX, clientY: e.clientY },
      }),
    )
  }, [])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-9 top-14 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "sim-panel flex w-72 max-w-[88vw] shrink-0 flex-col border-r border-border",
          "fixed bottom-9 left-0 top-14 z-40 transition-[transform,width] duration-200 ease-out lg:static lg:bottom-auto lg:top-auto lg:z-auto lg:overflow-hidden",
          isOpen
            ? "translate-x-0 lg:w-64 lg:translate-x-0"
            : "-translate-x-full lg:w-0 lg:-translate-x-full lg:border-r-0",
        )}
      >
        {/* Header */}
        <div className="border-b border-border/80 bg-background/20 px-3 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutGrid className="size-3.5" />
              </div>
              <h2 className="text-[13px] font-bold text-foreground">Parts Library</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close library"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Drag a part onto the workbench</p>

          {/* Search */}
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components…"
              aria-label="Search components"
              className="h-8 rounded-lg border-border/80 bg-background/60 pl-8 pr-7 text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="sim-scrollbar mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
            <CategoryTab
              label="All"
              count={items.length}
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {categories.map((cat) => (
              <CategoryTab
                key={cat}
                label={CATEGORY_LABELS[cat] ?? cat}
                count={items.filter((i) => i.category === cat).length}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>

        {/* Parts list */}
        <div className="sim-scrollbar flex-1 overflow-y-auto p-2 space-y-4">
          {Object.keys(grouped).length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No parts match your search
            </p>
          )}
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              {activeCategory === "all" && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[category] ?? category}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-[9px] normal-case tracking-normal">
                    {categoryItems.length}
                  </Badge>
                </div>
              )}
              <div className="space-y-1">
                {categoryItems.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onPointerDown={(e) => handlePointerDown(e, item.type, item.name)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    title={`Drag ${item.name} to canvas`}
                    className={cn(
                      "group flex cursor-grab items-center gap-2 rounded-lg border border-transparent",
                      "bg-background/40 px-2 py-1.5 transition-all duration-150",
                      "hover:border-primary/30 hover:bg-primary/[0.04] hover:shadow-sm",
                      "active:cursor-grabbing active:scale-[0.98]",
                    )}
                  >
                    <GripVertical className="size-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 p-1">
                      <ComponentThumbnail type={item.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

function CategoryTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("font-mono text-[9px]", active ? "text-primary/70" : "text-muted-foreground/60")}>
        {count}
      </span>
    </button>
  )
}
