"use client"

import { Maximize2, ZoomIn, ZoomOut, MousePointer2, Cable } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { cn } from "@/lib/utils"

interface CanvasToolbarProps {
  className?: string
}

export function CanvasToolbar({ className }: CanvasToolbarProps) {
  const { zoomIn, zoomOut, resetView } = useCanvasViewport()

  return (
    <div
      className={cn(
        "sim-panel pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-border p-1 shadow-lg",
        className,
      )}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={zoomIn}
        title="Zoom in (+)"
        className="size-8 rounded-lg"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={zoomOut}
        title="Zoom out (-)"
        className="size-8 rounded-lg"
      >
        <ZoomOut className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={resetView}
        title="Reset view"
        className="size-8 rounded-lg"
      >
        <Maximize2 className="size-4" />
      </Button>

      <div className="my-0.5 h-px bg-border" />

      <div
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
        title="Click pins to wire — drag components to move"
      >
        <Cable className="size-4" />
      </div>
      <div
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
        title="Pan canvas — drag empty space or middle-click"
      >
        <MousePointer2 className="size-4" />
      </div>
    </div>
  )
}
