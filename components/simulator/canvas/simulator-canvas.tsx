"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { GridBackground } from "@/components/simulator/canvas/grid-background"
import { WireLayer } from "@/components/simulator/canvas/wire-layer"
import { PlacedComponentItem } from "@/components/simulator/canvas/component-item"
import { ComponentDefs } from "@/components/simulator/canvas/component-defs"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useWireDrawing } from "@/hooks/simulator/use-wire-drawing"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { createPlacedComponent } from "@/lib/simulator/utils/pins"
import { snapToGrid, screenToWorld } from "@/lib/simulator/utils/geometry"

export function SimulatorCanvas() {
  const { state, dispatch } = useSimulator()
  const { viewport, handleWheel, startPan, movePan, endPan, isPanning } = useCanvasViewport()
  const {
    wireDraft,
    rewireDraft,
    handlePinClick,
    updateWireDraft,
    updateRewireDraft,
    cancelWire,
    cancelRewire,
    startRewire,
  } = useWireDrawing()

  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const dragRef = useRef<{
    componentId: string
    startX: number
    startY: number
    compStartX: number
    compStartY: number
  } | null>(null)

  // Track container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName === "INPUT") return
        if (state.selectedComponentId) {
          dispatch({ type: "REMOVE_COMPONENT", id: state.selectedComponentId })
        } else if (state.selectedWireId) {
          dispatch({ type: "REMOVE_WIRE", id: state.selectedWireId })
        }
      }
      if (e.key === "Escape") {
        cancelWire()
        cancelRewire()
        dispatch({ type: "SELECT_COMPONENT", id: null })
        dispatch({ type: "SELECT_WIRE", id: null })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [state.selectedComponentId, state.selectedWireId, dispatch, cancelWire, cancelRewire])

  // Native HTML5 drag-and-drop (used below in handleDrop/handleDragOver)
  // never fires on touch devices, so the palette sidebar dispatches this
  // custom event instead when a touch drag ends over the canvas.
  useEffect(() => {
    const handleTouchDrop = (e: Event) => {
      const detail = (e as CustomEvent<{ type: string; clientX: number; clientY: number }>).detail
      if (!detail || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const isInside =
        detail.clientX >= rect.left &&
        detail.clientX <= rect.right &&
        detail.clientY >= rect.top &&
        detail.clientY <= rect.bottom
      if (!isInside) return

      const def = getComponentDefinition(detail.type)
      if (!def) return

      const world = screenToWorld(detail.clientX, detail.clientY, viewport, rect)
      const component = createPlacedComponent(def, snapToGrid(world.x), snapToGrid(world.y))
      dispatch({ type: "ADD_COMPONENT", component })
    }
    window.addEventListener("simulator:touch-drop", handleTouchDrop)
    return () => window.removeEventListener("simulator:touch-drop", handleTouchDrop)
  }, [viewport, dispatch])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("application/simulator-component")
      if (!type || !containerRef.current) return

      const def = getComponentDefinition(type)
      if (!def) return

      const rect = containerRef.current.getBoundingClientRect()
      const world = screenToWorld(e.clientX, e.clientY, viewport, rect)
      const component = createPlacedComponent(
        def,
        snapToGrid(world.x),
        snapToGrid(world.y)
      )
      dispatch({ type: "ADD_COMPONENT", component })
    },
    [viewport, dispatch]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as Element
      if (target.closest("[data-component-id]") && !target.closest("[data-pin-id]")) return
      if (target.closest("[data-wire-id]")) {
        const wireId = target.closest("[data-wire-id]")?.getAttribute("data-wire-id")
        if (wireId) {
          dispatch({ type: "SELECT_WIRE", id: wireId })
          return
        }
      }
      if (target.closest("[data-pin-id]")) return

      dispatch({ type: "SELECT_COMPONENT", id: null })
      dispatch({ type: "SELECT_WIRE", id: null })
      cancelWire()
      cancelRewire()

      if (e.button === 0 || e.button === 1) {
        startPan(e.clientX, e.clientY)
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      }
    },
    [dispatch, cancelWire, cancelRewire, startPan]
  )

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const world = screenToWorld(e.clientX, e.clientY, viewport, rect)
        const startWorld = screenToWorld(
          dragRef.current.startX,
          dragRef.current.startY,
          viewport,
          rect
        )
        dispatch({
          type: "MOVE_COMPONENT",
          id: dragRef.current.componentId,
          x: snapToGrid(dragRef.current.compStartX + (world.x - startWorld.x)),
          y: snapToGrid(dragRef.current.compStartY + (world.y - startWorld.y)),
        })
        return
      }

      if (isPanning.current) {
        movePan(e.clientX, e.clientY)
      }

      if (wireDraft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const world = screenToWorld(e.clientX, e.clientY, viewport, rect)
        updateWireDraft(world.x, world.y)
      }

      if (rewireDraft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const world = screenToWorld(e.clientX, e.clientY, viewport, rect)
        updateRewireDraft(world.x, world.y)
      }
    },
    [viewport, dispatch, movePan, isPanning, wireDraft, updateWireDraft, rewireDraft, updateRewireDraft]
  )

  const resolvePinTarget = useCallback((clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY)
    const pinElement = target?.closest("[data-pin-id]") as HTMLElement | null
    if (!pinElement) return null
    const componentElement = pinElement.closest("[data-component-id]")
    const componentId = componentElement?.getAttribute("data-component-id")
    const pinId = pinElement.getAttribute("data-pin-id")
    if (!componentId || !pinId) return null
    return { componentId, pinId }
  }, [])

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = null
      endPan()

      if (state.rewireDraft) {
        const target = resolvePinTarget(e.clientX, e.clientY)
        if (target) {
          handlePinClick(target.componentId, target.pinId)
        } else {
          cancelRewire()
        }
      } else if (!state.wireDraft) {
        cancelWire()
        cancelRewire()
      }

      try {
        ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
      } catch {
        // pointer may not be captured
      }
    },
    [endPan, cancelWire, cancelRewire, state.wireDraft, state.rewireDraft, resolvePinTarget, handlePinClick]
  )

  const handleComponentDragStart = useCallback(
    (componentId: string, e: React.PointerEvent) => {
      const comp = state.components.find((c) => c.id === componentId)
      if (!comp) return
      dragRef.current = {
        componentId,
        startX: e.clientX,
        startY: e.clientY,
        compStartX: comp.x,
        compStartY: comp.y,
      }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    },
    [state.components]
  )

  const handleSelect = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT_COMPONENT", id })
    },
    [dispatch]
  )

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden bg-background"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 touch-none select-none"
        onWheel={(e) => {
          if (containerRef.current) {
            handleWheel(e, containerRef.current.getBoundingClientRect())
          }
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
      >
        <ComponentDefs />
        <GridBackground
          viewport={viewport}
          width={dimensions.width}
          height={dimensions.height}
        />
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
          {state.components.map((component) => (
            <PlacedComponentItem
              key={component.id}
              component={component}
              onPinClick={handlePinClick}
              onSelect={handleSelect}
              onDragStart={handleComponentDragStart}
            />
          ))}
          <WireLayer
            wires={state.wires}
            wireDraft={wireDraft}
            rewireDraft={rewireDraft}
            onEndpointPointerDown={startRewire}
          />
        </g>
      </svg>
    </div>
  )
}
