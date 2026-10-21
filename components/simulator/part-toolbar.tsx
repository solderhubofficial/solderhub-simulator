"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GripVertical, Copy, RotateCcw, RotateCw, SlidersHorizontal, Trash2, X } from "lucide-react"
import { useSelectedComponent, useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { generateId } from "@/lib/simulator/utils/id"
import { GRID_SIZE } from "@/lib/simulator/constants"
import { rotatePoint, snapToGrid } from "@/lib/simulator/utils/geometry"
import { PART_SETTINGS_TYPES, PartSettings } from "@/components/simulator/part-settings"
import { useDragOffset } from "@/hooks/simulator/use-drag-offset"
import { cn } from "@/lib/utils"

const TOOLBAR_HEIGHT = 40
const GAP = 10

/**
 * Small floating toolbar for the selected part: the few actions people actually use (rotate, duplicate,
 * delete) and, only for parts that have adjustable values, a Settings popover. It replaces the old
 * full-height inspector, which covered the canvas and mostly showed read-only coordinates.
 */
export function PartToolbar({ viewport, width, height }: { viewport: { x: number; y: number; zoom: number }; width: number; height: number }) {
  const { dispatch } = useSimulator()
  const selected = useSelectedComponent()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const { offset, dragging, gripProps } = useDragOffset("solderhub-simulator:part-bar-pos", () => barRef.current)

  useEffect(() => { setSettingsOpen(false) }, [selected?.id])

  const box = useMemo(() => {
    if (!selected) return null
    const def = getComponentDefinition(selected.type)
    if (!def) return null
    const corners = [[0, 0], [def.width, 0], [def.width, def.height], [0, def.height]].map(([x, y]) => {
      const r = rotatePoint(x, y, selected.rotation)
      return { x: (selected.x + r.x) * viewport.zoom + viewport.x, y: (selected.y + r.y) * viewport.zoom + viewport.y }
    })
    const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y)
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
  }, [selected, viewport])

  if (!selected || !box) return null

  const hasSettings = PART_SETTINGS_TYPES.has(selected.type)
  const toolbarWidth = hasSettings ? 212 : 172
  const centreX = (box.left + box.right) / 2
  const left = Math.max(8, Math.min(width - toolbarWidth - 8, centreX - toolbarWidth / 2))
  // Prefer above the part; flip below when there is no room, and never leave the canvas.
  const above = box.top - TOOLBAR_HEIGHT - GAP
  const top = above >= 8 ? above : Math.min(height - TOOLBAR_HEIGHT - 8, box.bottom + GAP)

  const duplicate = () => {
    dispatch({
      type: "ADD_COMPONENT",
      component: {
        id: generateId("comp"),
        type: selected.type,
        name: selected.name,
        x: snapToGrid(selected.x + GRID_SIZE * 2),
        y: snapToGrid(selected.y + GRID_SIZE * 2),
        rotation: selected.rotation,
        metadata: JSON.parse(JSON.stringify(selected.metadata)),
      },
    })
  }

  const button = "flex size-8 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"

  const popoverTop = above >= 8 ? box.bottom + GAP : top + TOOLBAR_HEIGHT + GAP

  return (
    <>
    <div ref={barRef} className="pointer-events-none absolute z-20" style={{ left, top, width: toolbarWidth, transform: `translate(${offset.x}px, ${offset.y}px)` }} data-testid="part-toolbar">
      <div
        role="toolbar"
        aria-label={`${selected.name} actions`}
        className="pointer-events-auto flex items-center justify-between gap-0.5 rounded-xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div role="button" aria-label="Drag to move the toolbar (double-click to reset)" title="Drag to move · double-click to reset" {...gripProps} className={cn("flex h-8 w-4 touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted", dragging ? "cursor-grabbing" : "cursor-grab")}><GripVertical className="size-3.5" /></div>
        <button type="button" className={button} title="Rotate left (Shift + R)" aria-label="Rotate left" onClick={() => dispatch({ type: "ROTATE_COMPONENT", id: selected.id, counterClockwise: true })}><RotateCcw className="size-4" /></button>
        <button type="button" className={button} title="Rotate right (R)" aria-label="Rotate right" onClick={() => dispatch({ type: "ROTATE_COMPONENT", id: selected.id })}><RotateCw className="size-4" /></button>
        <button type="button" className={button} title="Duplicate (Ctrl/Cmd + D)" aria-label="Duplicate" onClick={duplicate}><Copy className="size-4" /></button>
        {hasSettings && (
          <button type="button" className={cn(button, settingsOpen && "bg-primary/10 text-primary")} title="Settings" aria-label="Settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}><SlidersHorizontal className="size-4" /></button>
        )}
        <button type="button" className={cn(button, "hover:bg-red-500/10 hover:text-red-600")} title="Delete (Del)" aria-label="Delete" onClick={() => dispatch({ type: "REMOVE_COMPONENT", id: selected.id })}><Trash2 className="size-4" /></button>
      </div>
    </div>
      {hasSettings && settingsOpen && (
        <div
          className="sim-scrollbar pointer-events-auto absolute z-20 max-h-[min(55vh,420px)] w-64 overflow-y-auto rounded-xl border border-border/70 bg-card/95 p-3 shadow-xl backdrop-blur"
          style={{ left: Math.max(8, Math.min(width - 264, centreX - 128 + offset.x)), top: Math.max(8, Math.min(height - 200, popoverTop + offset.y)) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="truncate text-xs font-semibold text-foreground">{selected.name}</p>
            <button type="button" aria-label="Close settings" className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={() => setSettingsOpen(false)}><X className="size-3.5" /></button>
          </div>
          <PartSettings selected={selected} />
        </div>
      )}
    </>
  )
}
