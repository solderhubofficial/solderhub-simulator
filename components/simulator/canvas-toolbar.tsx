"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Cable,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Columns2,
  FileCode2,
  FileImage,
  GripHorizontal,
  GripVertical,
  ImageDown,
  Maximize2,
  Redo2,
  RotateCw,
  Rows2,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { exportCircuitImage, EmptyCircuitError, type ExportFormat } from "@/lib/simulator/export-image"
import { DiagramGenerator } from "@/components/simulator/diagram-generator"
import { cn } from "@/lib/utils"
import { requestFitView } from "@/lib/simulator/fit-request"
import type { WireAngleMode } from "@/types/simulator"

interface CanvasToolbarProps {
  className?: string
  /** Returns the live canvas <svg> so it can be exported as an image. */
  getSvg?: () => SVGSVGElement | null
}

type Orientation = "vertical" | "horizontal"
type PopoverId = "export" | "help"

const STORAGE_KEY = "solderhub-simulator:toolbar-v1"
const MARGIN = 12
const EDGE_SNAP = 28

const ANGLE_MODES: { id: WireAngleMode; label: string; title: string }[] = [
  { id: "90", label: "90°", title: "Wires turn at right angles only" },
  { id: "45", label: "45°", title: "Wires can also run at 45° diagonals" },
  { id: "free", label: "Free", title: "Place bends anywhere (snaps to the grid; hold Shift for pixel-precise)" },
]

const btn = "size-8 rounded-xl tap-pad"

function readSaved(): { x: number; y: number; orientation: Orientation; collapsed: boolean; angle?: WireAngleMode } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Record<string, unknown>
    return {
      x: typeof v.x === "number" ? v.x : MARGIN,
      y: typeof v.y === "number" ? v.y : MARGIN,
      orientation: v.orientation === "horizontal" ? "horizontal" : "vertical",
      collapsed: v.collapsed === true,
      angle: v.angle === "90" || v.angle === "45" || v.angle === "free" ? v.angle : undefined,
    }
  } catch {
    return null
  }
}

export function CanvasToolbar({ className, getSvg }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, resetView, setZoomAtPoint } = useCanvasViewport()
  const { state, dispatch, undo, redo, canUndo, canRedo } = useSimulator()
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const [pos, setPos] = useState({ x: MARGIN, y: MARGIN })
  const [orientation, setOrientation] = useState<Orientation>("vertical")
  const [collapsed, setCollapsed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [area, setArea] = useState({ w: 0, h: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [popover, setPopover] = useState<PopoverId | null>(null)
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const isEmpty = state.components.length === 0
  const selectedComponent = state.components.find((c) => c.id === state.selectedComponentId) ?? null
  const hasSelection = Boolean(selectedComponent || state.selectedWireId)
  const horizontal = orientation === "horizontal"

  // Restore the saved position, orientation and wire-angle mode.
  useEffect(() => {
    const saved = readSaved()
    if (saved) {
      setPos({ x: saved.x, y: saved.y })
      setOrientation(saved.orientation)
      setCollapsed(saved.collapsed)
      if (saved.angle) dispatch({ type: "SET_WIRE_ANGLE", mode: saved.angle })
    }
    setLoaded(true)
  }, [dispatch])

  const save = useCallback((next: Partial<{ x: number; y: number; orientation: Orientation; collapsed: boolean; angle: WireAngleMode }>) => {
    try {
      const current = readSaved() ?? { x: MARGIN, y: MARGIN, orientation: "vertical" as Orientation, collapsed: false }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...next }))
    } catch { /* Toolbar position is a convenience only. */ }
  }, [])

  const clamp = useCallback((x: number, y: number, w: number, h: number, areaW: number, areaH: number) => ({
    x: Math.max(4, Math.min(Math.max(4, areaW - w - 4), x)),
    y: Math.max(4, Math.min(Math.max(4, areaH - h - 4), y)),
  }), [])

  // Track the canvas area and the toolbar's own size so it can never end up off-screen.
  useLayoutEffect(() => {
    const root = rootRef.current
    const parent = root?.offsetParent as HTMLElement | null
    if (!root || !parent) return
    const measure = () => {
      setArea({ w: parent.clientWidth, h: parent.clientHeight })
      setSize({ w: root.offsetWidth, h: root.offsetHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!area.w || !size.w) return
    setPos((p) => {
      const next = clamp(p.x, p.y, size.w, size.h, area.w, area.h)
      return next.x === p.x && next.y === p.y ? p : next
    })
  }, [area, size, clamp])

  useEffect(() => {
    if (!popover) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPopover(null)
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPopover(null)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [popover])

  const onGripDown = (e: React.PointerEvent) => {
    const root = rootRef.current
    const parent = root?.offsetParent as HTMLElement | null
    if (!root || !parent) return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    setDragging(true)
    setPopover(null)
  }
  const onGripMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    setPos(clamp(drag.origX + e.clientX - drag.startX, drag.origY + e.clientY - drag.startY, size.w, size.h, area.w, area.h))
  }
  const onGripUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    const el = e.currentTarget as Element
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
    // Dock to a nearby edge so it lines up neatly with the canvas border.
    setPos((p) => {
      let { x, y } = p
      if (x < EDGE_SNAP) x = MARGIN
      else if (area.w - (x + size.w) < EDGE_SNAP) x = area.w - size.w - MARGIN
      if (y < EDGE_SNAP) y = MARGIN
      else if (area.h - (y + size.h) < EDGE_SNAP) y = area.h - size.h - MARGIN
      const next = clamp(x, y, size.w, size.h, area.w, area.h)
      save(next)
      return next
    })
  }

  const toggleOrientation = () => {
    const next: Orientation = horizontal ? "vertical" : "horizontal"
    setOrientation(next)
    setPopover(null)
    save({ orientation: next })
  }
  const toggleCollapsed = () => {
    setCollapsed((c) => { save({ collapsed: !c }); return !c })
    setPopover(null)
  }
  const setAngle = (mode: WireAngleMode) => {
    dispatch({ type: "SET_WIRE_ANGLE", mode })
    save({ angle: mode })
  }

  const zoomTo100 = () => {
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    if (parent) setZoomAtPoint(1, parent.clientWidth / 2, parent.clientHeight / 2)
    else resetView()
  }

  const handleExport = async (format: ExportFormat) => {
    const svg = getSvg?.()
    if (!svg) return
    setExportError(null)
    try {
      await exportCircuitImage(svg, format, "solderhub-circuit")
      setPopover(null)
    } catch (err) {
      setExportError(err instanceof EmptyCircuitError ? err.message : "Couldn't export the image — try SVG instead.")
    }
  }

  // Open menus toward the side that has room, wherever the toolbar has been dragged.
  const popoverPlacement = horizontal
    ? pos.y + size.h / 2 < area.h / 2 ? "top-full left-0 mt-2" : "bottom-full left-0 mb-2"
    : pos.x + size.w / 2 < area.w / 2 ? "left-full top-0 ml-2" : "right-full top-0 mr-2"

  const Divider = () => <div className={horizontal ? "mx-0.5 h-8 w-px self-center bg-border" : "my-0.5 h-px bg-border"} />
  const GripIcon = horizontal ? GripVertical : GripHorizontal

  const grip = (
    <div
      role="button"
      aria-label="Drag to move the toolbar"
      title="Drag to move the toolbar"
      onPointerDown={onGripDown}
      onPointerMove={onGripMove}
      onPointerUp={onGripUp}
      onPointerCancel={onGripUp}
      className={cn(
        "flex touch-none items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground",
        horizontal ? "h-8 w-5" : "h-5 w-8",
        dragging ? "cursor-grabbing bg-muted" : "cursor-grab",
      )}
    >
      <GripIcon className="size-4" />
    </div>
  )

  return (
    <>
      <div
        ref={rootRef}
        style={{ left: pos.x, top: pos.y, visibility: loaded ? "visible" : "hidden" }}
        className={cn(
          "sim-panel pointer-events-auto absolute z-10 flex gap-0.5 rounded-2xl border border-border/80 p-1 shadow-xl shadow-black/5",
          horizontal ? "flex-row items-center" : "flex-col",
          dragging && "shadow-2xl ring-2 ring-primary/40",
          className,
        )}
      >
        {grip}

        {collapsed ? (
          <Button size="icon-sm" variant="ghost" onClick={toggleCollapsed} title="Expand toolbar" aria-label="Expand toolbar" className={btn}>
            <ChevronDown className="size-4" />
          </Button>
        ) : (
          <>
            {/* View */}
            <Button size="icon-sm" variant="ghost" onClick={zoomIn} title="Zoom in (+)" className={btn}><ZoomIn className="size-4" /></Button>
            <button
              type="button"
              onClick={zoomTo100}
              title="Reset zoom to 100%"
              className="flex h-6 min-w-8 items-center justify-center rounded-lg px-1 font-mono text-[10px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {Math.round(state.viewport.zoom * 100)}%
            </button>
            <Button size="icon-sm" variant="ghost" onClick={zoomOut} title="Zoom out (-)" className={btn}><ZoomOut className="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" onClick={() => (isEmpty ? resetView() : requestFitView())} title="Fit circuit to screen" className={btn}><Maximize2 className="size-4" /></Button>

            <Divider />

            {/* Wire angle */}
            <div className={cn("flex gap-0.5", horizontal ? "flex-row" : "flex-col")} role="group" aria-label="Wire angle">
              {ANGLE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAngle(mode.id)}
                  aria-pressed={state.wireAngle === mode.id}
                  title={`Wire angle: ${mode.title}`}
                  className={cn(
                    "flex h-7 min-w-8 items-center justify-center rounded-lg px-1 text-[10px] font-bold transition-colors",
                    state.wireAngle === mode.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <Divider />

            {/* Edit */}
            <Button size="icon-sm" variant="ghost" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo" className={btn}><Undo2 className="size-4" /></Button>
            <Button size="icon-sm" variant="ghost" onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" aria-label="Redo" className={btn}><Redo2 className="size-4" /></Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!selectedComponent}
              onClick={() => selectedComponent && dispatch({ type: "ROTATE_COMPONENT", id: selectedComponent.id })}
              title="Rotate selected part 90°"
              aria-label="Rotate selected part"
              className={btn}
            ><RotateCw className="size-4" /></Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!hasSelection}
              onClick={() => {
                if (selectedComponent) dispatch({ type: "REMOVE_COMPONENT", id: selectedComponent.id })
                else if (state.selectedWireId) dispatch({ type: "REMOVE_WIRE", id: state.selectedWireId })
              }}
              title="Delete selected part or wire (Del)"
              aria-label="Delete selected"
              className={cn(btn, hasSelection && "text-destructive hover:text-destructive")}
            ><Trash2 className="size-4" /></Button>

            <Divider />

            {/* Export + help */}
            <div className="relative">
              <Button
                size="icon-sm"
                variant={popover === "export" ? "secondary" : "ghost"}
                onClick={() => { setExportError(null); setPopover((p) => (p === "export" ? null : "export")) }}
                disabled={isEmpty}
                title={isEmpty ? "Add components to export an image" : "Save circuit as image (PNG / SVG)"}
                aria-label="Save circuit as image"
                aria-haspopup="menu"
                aria-expanded={popover === "export"}
                className={btn}
              ><ImageDown className="size-4" /></Button>
              {popover === "export" && (
                <div role="menu" className={cn("sim-panel absolute z-20 w-48 rounded-xl border border-border/80 p-1 shadow-xl shadow-black/10", popoverPlacement)}>
                  <button type="button" role="menuitem" onClick={() => handleExport("png")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent">
                    <FileImage className="size-4 text-muted-foreground" />
                    <span>Save as PNG<span className="block text-[10px] font-normal text-muted-foreground">Image, 2x sharp</span></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleExport("svg")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent">
                    <FileCode2 className="size-4 text-muted-foreground" />
                    <span>Save as SVG<span className="block text-[10px] font-normal text-muted-foreground">Vector, scales forever</span></span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button type="button" role="menuitem" onClick={() => { setPopover(null); setDiagramOpen(true) }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent">
                    <Cable className="size-4 text-muted-foreground" />
                    <span>Wiring diagram…<span className="block text-[10px] font-normal text-muted-foreground">Clean pin-to-pin sheet</span></span>
                  </button>
                  {exportError && <p className="px-2.5 py-1.5 text-[10px] text-destructive">{exportError}</p>}
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                size="icon-sm"
                variant={popover === "help" ? "secondary" : "ghost"}
                onClick={() => setPopover((p) => (p === "help" ? null : "help"))}
                title="Wiring tips"
                aria-label="Wiring tips"
                aria-expanded={popover === "help"}
                className={btn}
              ><CircleHelp className="size-4" /></Button>
              {popover === "help" && (
                <div className={cn("sim-panel absolute z-20 w-64 rounded-xl border border-border/80 p-3 text-xs shadow-xl shadow-black/10", popoverPlacement)}>
                  <p className="mb-1.5 font-semibold text-foreground">Wiring tips</p>
                  <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                    <li><b className="text-foreground">Click a pin</b>, then click empty space to add bends, then click the target pin.</li>
                    <li><b className="text-foreground">Backspace</b> or right-click removes the last bend; <b className="text-foreground">Esc</b> cancels.</li>
                    <li>Select a wire: drag <b className="text-foreground">◆</b> to move a bend, drag <b className="text-foreground">+</b> to add one, double-click a bend to delete it.</li>
                    <li>Choose <b className="text-foreground">90° / 45° / Free</b> in the toolbar. Hold <b className="text-foreground">Shift</b> for pixel-precise placement.</li>
                    <li>Drag a wire end to a different pin to re-route it. Drag the grip to move this toolbar anywhere.</li>
                  </ul>
                </div>
              )}
            </div>

            <Divider />

            {/* Layout */}
            <Button size="icon-sm" variant="ghost" onClick={toggleOrientation} title={horizontal ? "Make toolbar vertical" : "Make toolbar horizontal"} aria-label="Toggle toolbar orientation" className={btn}>
              {horizontal ? <Rows2 className="size-4" /> : <Columns2 className="size-4" />}
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={toggleCollapsed} title="Collapse toolbar" aria-label="Collapse toolbar" className={btn}>
              <ChevronUp className="size-4" />
            </Button>
          </>
        )}
      </div>
      {diagramOpen && createPortal(<DiagramGenerator onClose={() => setDiagramOpen(false)} />, document.body)}
    </>
  )
}
