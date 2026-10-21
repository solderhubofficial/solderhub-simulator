"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Cable,
  ChevronDown,
  CircleHelp,
  FileCode2,
  FileImage,
  ImageDown,
  Maximize2,
  Trash2,
  GripVertical,
  Minus,
  Plus,
} from "lucide-react"
import { useDragOffset } from "@/hooks/simulator/use-drag-offset"
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

type PopoverId = "export" | "help"

const STORAGE_KEY = "solderhub-simulator:toolbar-v1"

const ANGLE_MODES: { id: WireAngleMode; label: string; title: string }[] = [
  { id: "90", label: "90°", title: "Wires turn at right angles only" },
  { id: "45", label: "45°", title: "Wires can also run at 45° diagonals" },
  { id: "free", label: "Free", title: "Place bends anywhere (snaps to the grid; hold Shift for pixel-precise)" },
]


function readAngle(): WireAngleMode | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const v = JSON.parse(raw) as Record<string, unknown>
    return v.angle === "90" || v.angle === "45" || v.angle === "free" ? v.angle : undefined
  } catch {
    return undefined
  }
}

const pillBtn = "tap-pad flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"

/** Floating tool pill (top centre), zoom control (bottom left) and run status (bottom right) over the canvas. */
export function CanvasToolbar({ className, getSvg }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, resetView, setZoomAtPoint } = useCanvasViewport()
  const { state, dispatch } = useSimulator()
  const rootRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const { offset, dragging, gripProps } = useDragOffset("solderhub-simulator:tool-pill-pos", () => pillRef.current)
  const [popover, setPopover] = useState<PopoverId | "angle" | null>(null)
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const isEmpty = state.components.length === 0
  const selectedComponent = state.components.find((c) => c.id === state.selectedComponentId) ?? null

  useEffect(() => {
    const saved = readAngle()
    if (saved) dispatch({ type: "SET_WIRE_ANGLE", mode: saved })
  }, [dispatch])

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

  const setAngle = (mode: WireAngleMode) => {
    dispatch({ type: "SET_WIRE_ANGLE", mode })
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ angle: mode })) } catch { /* convenience only */ }
    setPopover(null)
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

  const angleLabel = state.wireAngle === "45" ? "45° bends" : state.wireAngle === "free" ? "Free bends" : "Right angles"
  const menu = "sim-panel absolute z-20 rounded-xl border border-border p-1 shadow-xl shadow-black/10"

  return (
    <>
      <div ref={rootRef} className={cn("pointer-events-none absolute inset-0 z-10", className)}>
        {/* Tool pill */}
        <div
          ref={pillRef}
          role="toolbar"
          aria-label="Canvas tools"
          style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
          className={cn("sim-panel pointer-events-auto absolute left-1/2 top-4 flex max-w-[calc(100%-1.5rem)] items-center gap-0.5 rounded-xl border border-border p-1 shadow-lg shadow-black/10", dragging && "ring-2 ring-primary/40")}
        >
          <div
            role="button"
            aria-label="Drag to move the toolbar (double-click to reset)"
            title="Drag to move · double-click to reset"
            {...gripProps}
            className={cn("flex h-10 w-5 touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground", dragging ? "cursor-grabbing" : "cursor-grab")}
          ><GripVertical className="size-4" /></div>
          <button type="button" onClick={() => (isEmpty ? resetView() : requestFitView())} title="Fit circuit to screen" aria-label="Fit circuit to screen" className={pillBtn}>
            <Maximize2 className="size-[18px]" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setExportError(null); setPopover((p) => (p === "export" ? null : "export")) }}
              disabled={isEmpty}
              title={isEmpty ? "Add components to export an image" : "Save circuit as image (PNG / SVG)"}
              aria-label="Save circuit as image"
              aria-haspopup="menu"
              aria-expanded={popover === "export"}
              className={cn(pillBtn, popover === "export" && "bg-muted text-foreground")}
            ><ImageDown className="size-[18px]" /></button>
            {popover === "export" && (
              <div role="menu" className={cn(menu, "left-0 top-full mt-2 w-52")}>
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
            <button
              type="button"
              onClick={() => setPopover((p) => (p === "help" ? null : "help"))}
              title="Wiring tips"
              aria-label="Wiring tips"
              aria-expanded={popover === "help"}
              className={cn(pillBtn, popover === "help" && "bg-muted text-foreground")}
            ><CircleHelp className="size-[18px]" /></button>
            {popover === "help" && (
              <div className={cn(menu, "left-0 top-full mt-2 w-72 p-3 text-xs")}>
                <p className="mb-1.5 font-semibold text-foreground">Wiring tips</p>
                <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                  <li><b className="text-foreground">Click a pin</b>, then click empty space to add bends, then click the target pin.</li>
                  <li>Click a wire to finish on it — that makes a junction.</li>
                  <li><b className="text-foreground">Backspace</b> or right-click removes the last bend; <b className="text-foreground">Esc</b> cancels.</li>
                  <li>Select a wire: drag <b className="text-foreground">◆</b> to move a bend, drag <b className="text-foreground">+</b> to add one, double-click a bend to delete it.</li>
                  <li>Hold <b className="text-foreground">Shift</b> for pixel-precise placement.</li>
                  <li>Select a part for its rotate (<b className="text-foreground">R</b>), duplicate and delete buttons.</li>
                </ul>
              </div>
            )}
          </div>

          {state.selectedWireId && !selectedComponent && (
            <button
              type="button"
              onClick={() => state.selectedWireId && dispatch({ type: "REMOVE_WIRE", id: state.selectedWireId })}
              title="Delete selected wire (Del)"
              aria-label="Delete selected wire"
              className={cn(pillBtn, "text-destructive hover:text-destructive")}
            ><Trash2 className="size-[18px]" /></button>
          )}

          <div className="mx-1.5 h-6 w-px bg-border" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setPopover((p) => (p === "angle" ? null : "angle"))}
              aria-haspopup="menu"
              aria-expanded={popover === "angle"}
              title="Wire angle"
              className="tap-pad flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {angleLabel}
              <ChevronDown className="size-3.5" />
            </button>
            {popover === "angle" && (
              <div role="menu" className={cn(menu, "right-0 top-full mt-2 w-60")}>
                {ANGLE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={state.wireAngle === mode.id}
                    onClick={() => setAngle(mode.id)}
                    className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-accent", state.wireAngle === mode.id && "text-primary")}
                  >
                    <span className="w-8 font-bold">{mode.label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{mode.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zoom, bottom left */}
        <div className="sim-panel pointer-events-auto absolute bottom-4 left-4 flex items-center overflow-hidden rounded-[10px] border border-border">
          <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out (-)" className="tap-pad flex size-9 items-center justify-center text-foreground/80 hover:bg-muted"><Minus className="size-4" /></button>
          <button type="button" onClick={zoomTo100} title="Reset zoom to 100%" className="min-w-[52px] text-center font-mono text-xs text-foreground/80 hover:text-foreground">{Math.round(state.viewport.zoom * 100)}%</button>
          <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in (+)" className="tap-pad flex size-9 items-center justify-center text-foreground/80 hover:bg-muted"><Plus className="size-4" /></button>
          <button type="button" onClick={() => (isEmpty ? resetView() : requestFitView())} className="h-9 border-l border-border px-3 text-xs text-foreground/80 hover:bg-muted">Fit</button>
        </div>

        {/* Run status, bottom right */}
        <div className="sim-panel pointer-events-none absolute bottom-4 right-4 flex h-9 items-center gap-2.5 rounded-[10px] border border-border px-3.5 text-xs text-foreground/80">
          <span className={cn("size-2 rounded-full", state.isRunning ? "bg-status-running animate-pulse" : "bg-status-idle")} />
          <span>{state.isRunning ? "Running" : "Stopped"}</span>
        </div>
      </div>
      {diagramOpen && createPortal(<DiagramGenerator onClose={() => setDiagramOpen(false)} />, document.body)}
    </>
  )
}
