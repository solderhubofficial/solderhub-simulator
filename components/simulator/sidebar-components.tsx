"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { getPaletteItems } from "@/lib/simulator/registry"
import { ComponentThumbnail } from "@/components/simulator/component-thumbnail"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CATEGORY_LABELS: Record<string, string> = {
  board: "Boards",
  passive: "Passive",
  active: "Active",
  input: "Inputs",
  output: "Outputs",
}

// Distance (in px) a touch pointer must travel before a press on a palette
// card is treated as a drag rather than a scroll of the list.
const TOUCH_DRAG_THRESHOLD = 10

interface ComponentsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ComponentsSidebar({ isOpen, onClose }: ComponentsSidebarProps) {
  const items = getPaletteItems()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[item.category] ?? item.category).toLowerCase().includes(q)
    )
  }, [items, query])

  const grouped = filtered.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: string) => {
      e.dataTransfer.setData("application/simulator-component", type)
      e.dataTransfer.effectAllowed = "copy"
    },
    []
  )

  // Touch devices never fire HTML5 dragstart/drop, so we run a parallel
  // pointer-based drag for touch input only and hand the result to the
  // canvas via a custom "simulator:touch-drop" window event.
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
    }
    e.preventDefault()
    setDragPreview({ x: e.clientX, y: e.clientY, label: drag.name })
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const drag = touchDragRef.current
    touchDragRef.current = null
    setDragPreview(null)
    if (!drag?.active) return
    window.dispatchEvent(
      new CustomEvent("simulator:touch-drop", {
        detail: { type: drag.type, clientX: e.clientX, clientY: e.clientY },
      })
    )
  }, [])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-border bg-card shadow-sm lg:w-64",
          "fixed bottom-0 left-0 top-14 z-40 transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:translate-x-0 lg:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Components</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close components panel"
              className="text-muted-foreground hover:text-foreground lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Drag a part onto the canvas</p>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts..."
              aria-label="Search components"
              className="h-8 rounded-lg pl-8 pr-7 text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {Object.keys(grouped).length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              No parts match &ldquo;{query}&rdquo;
            </p>
          )}
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="h-3 w-0.5 rounded-full bg-primary/60" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {categoryItems.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onPointerDown={(e) => handlePointerDown(e, item.type, item.name)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    title={item.name}
                    className={cn(
                      "group flex cursor-grab flex-col overflow-hidden rounded-xl border border-border",
                      "bg-background transition-all duration-150",
                      "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
                      "active:cursor-grabbing active:translate-y-0"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-16 items-center justify-center p-2",
                        "bg-[radial-gradient(circle,theme(colors.border)_1px,transparent_1px)]",
                        "bg-[length:10px_10px]",
                        "transition-colors group-hover:bg-primary/[0.04]"
                      )}
                    >
                      <ComponentThumbnail type={item.type} />
                    </div>
                    <div className="border-t border-border px-2 py-1.5">
                      <p className="truncate text-[11px] font-medium leading-tight text-foreground">
                        {item.name}
                      </p>
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
          className="pointer-events-none fixed z-[100] rounded-lg border border-primary bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg"
          style={{ left: dragPreview.x + 14, top: dragPreview.y + 14 }}
        >
          {dragPreview.label}
        </div>
      )}
    </>
  )
}
