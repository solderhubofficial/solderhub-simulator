"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Maximize2, ZoomIn, ZoomOut, MousePointer2, Cable, ImageDown, FileImage, FileCode2, Cable as CableIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { exportCircuitImage, EmptyCircuitError, type ExportFormat } from "@/lib/simulator/export-image"
import { DiagramGenerator } from "@/components/simulator/diagram-generator"
import { cn } from "@/lib/utils"
import { requestFitView } from "@/lib/simulator/fit-request"

interface CanvasToolbarProps {
  className?: string
  /** Returns the live canvas <svg> so it can be exported as an image. */
  getSvg?: () => SVGSVGElement | null
}

export function CanvasToolbar({ className, getSvg }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, resetView } = useCanvasViewport()
  const { state } = useSimulator()
  const [exportOpen, setExportOpen] = useState(false)
  const [diagramOpen, setDiagramOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const isEmpty = state.components.length === 0

  useEffect(() => {
    if (!exportOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExportOpen(false)
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [exportOpen])

  const handleExport = async (format: ExportFormat) => {
    const svg = getSvg?.()
    if (!svg) return
    setExportError(null)
    try {
      await exportCircuitImage(svg, format, "solderhub-circuit")
      setExportOpen(false)
    } catch (err) {
      setExportError(err instanceof EmptyCircuitError ? err.message : "Couldn't export the image — try SVG instead.")
    }
  }

  return (
    <>
    <div
      className={cn(
        "sim-panel pointer-events-auto flex flex-col gap-0.5 rounded-2xl border border-border/80 p-1 shadow-xl shadow-black/5",
        className,
      )}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={zoomIn}
        title="Zoom in (+)"
        className="size-8 rounded-xl tap-pad"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={zoomOut}
        title="Zoom out (-)"
        className="size-8 rounded-xl tap-pad"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => (isEmpty ? resetView() : requestFitView())}
        title="Fit circuit to screen"
        className="size-8 rounded-xl tap-pad"
      >
        <Maximize2 className="size-4" />
      </Button>

      <div className="my-0.5 h-px bg-border" />

      <div ref={exportRef} className="relative">
        <Button
          size="icon-sm"
          variant={exportOpen ? "secondary" : "ghost"}
          onClick={() => {
            setExportError(null)
            setExportOpen((v) => !v)
          }}
          disabled={isEmpty}
          title={isEmpty ? "Add components to export an image" : "Save circuit as image (PNG / SVG)"}
          aria-label="Save circuit as image"
          aria-haspopup="menu"
          aria-expanded={exportOpen}
          className="size-8 rounded-xl tap-pad"
        >
          <ImageDown className="size-4" />
        </Button>
        {exportOpen && (
          <div
            role="menu"
            className="sim-panel absolute left-full top-0 z-20 ml-2 w-48 rounded-xl border border-border/80 p-1 shadow-xl shadow-black/10"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleExport("png")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent"
            >
              <FileImage className="size-4 text-muted-foreground" />
              <span>
                Save as PNG
                <span className="block text-[10px] font-normal text-muted-foreground">Image, 2x sharp</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleExport("svg")}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent"
            >
              <FileCode2 className="size-4 text-muted-foreground" />
              <span>
                Save as SVG
                <span className="block text-[10px] font-normal text-muted-foreground">Vector, scales forever</span>
              </span>
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setExportOpen(false)
                setDiagramOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-accent"
            >
              <CableIcon className="size-4 text-muted-foreground" />
              <span>
                Wiring diagram…
                <span className="block text-[10px] font-normal text-muted-foreground">Clean pin-to-pin sheet</span>
              </span>
            </button>
            {exportError && <p className="px-2.5 py-1.5 text-[10px] text-destructive">{exportError}</p>}
          </div>
        )}
      </div>

      <div className="my-0.5 h-px bg-border" />

      <div
        className="flex size-8 items-center justify-center rounded-xl text-muted-foreground"
        title="Click pins to wire — drag components to move"
      >
        <Cable className="size-4" />
      </div>
      <div
        className="flex size-8 items-center justify-center rounded-xl text-muted-foreground"
        title="Pan canvas — drag empty space or middle-click"
      >
        <MousePointer2 className="size-4" />
      </div>
    </div>
    {diagramOpen && createPortal(<DiagramGenerator onClose={() => setDiagramOpen(false)} />, document.body)}
    </>
  )
}
