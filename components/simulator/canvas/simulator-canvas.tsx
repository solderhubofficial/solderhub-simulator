"use client"

import { pinElementAt, wireIdAt } from "./pin-hit-test"
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
import { CanvasToolbar } from "@/components/simulator/canvas-toolbar"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { PartToolbar } from "@/components/simulator/part-toolbar"
import { useCanvasViewport } from "@/hooks/simulator/use-canvas-viewport"
import { useWireDrawing } from "@/hooks/simulator/use-wire-drawing"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { createPlacedComponent } from "@/lib/simulator/utils/pins"
import { generateId } from "@/lib/simulator/utils/id"
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM } from "@/lib/simulator/constants"
import { computeFitViewport } from "@/lib/simulator/utils/fit-view"
import { hasBoard } from "@/lib/simulator/board-label"
import { snapToGrid, screenToWorld } from "@/lib/simulator/utils/geometry"
import type { PlacedComponent } from "@/types/simulator"
import { leadOutPoint, pinAnchor } from "@/lib/simulator/utils/wire-anchors"
import { snapWirePoint } from "@/lib/simulator/utils/wire-snap"
import { junctionPinId, nearestOnPolyline, splitWireAt } from "@/lib/simulator/utils/wire-junction"
import { closeOrthogonal } from "@/lib/simulator/utils/wire-waypoints"
import type { Point, RouteEndpoint } from "@/lib/simulator/utils/wire-routing"

export function SimulatorCanvas() {
  const { state, dispatch, undo, redo, getPinsForComponent } = useSimulator()
  const { viewport, handleWheel, setZoomAtPoint, startPan, movePan, endPan, isPanning } = useCanvasViewport()
  const {
    wireDraft,
    rewireDraft,
    handlePinClick,
    updateWireDraft,
    updateRewireDraft,
    addWaypoint,
    popWaypoint,
    cancelWire,
    cancelRewire,
    startRewire,
    startWire,
  } = useWireDrawing()

  const containerRef = useRef<HTMLDivElement>(null)
  const wireRoutedRef = useRef<Map<string, { routed: Point[]; fromEnd: RouteEndpoint; toEnd: RouteEndpoint }>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const dragRef = useRef<{
    componentId: string
    startX: number
    startY: number
    compStartX: number
    compStartY: number
  } | null>(null)

  // Two-finger pinch-to-zoom/pan. Mouse/pen never produce a second
  // simultaneous pointer, so this only ever activates for touch.
  const touchPoints = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isPinching = useRef(false)
  const pinchStartDist = useRef(0)
  const pinchStartZoom = useRef(1)

  // Keep the latest components reachable from the fit-view listener without re-subscribing.
  const componentsRef = useRef(state.components)
  componentsRef.current = state.components
  const canRun = hasBoard(state.components)
  const canRunRef = useRef(canRun)
  canRunRef.current = canRun

  // "simulator:fit-view" frames the whole circuit (fired after import / project load / Fit button).
  useEffect(() => {
    let timer: number | undefined
    const fit = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const boxes = componentsRef.current.flatMap((c) => {
          const def = getComponentDefinition(c.type)
          return def ? [{ x: c.x, y: c.y, width: def.width, height: def.height, rotation: c.rotation }] : []
        })
        const next = computeFitViewport(boxes, { width: rect.width, height: rect.height }, { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM })
        dispatch({ type: "SET_VIEWPORT", viewport: next ?? { x: 0, y: 0, zoom: 1 } })
      }, 80)
    }
    window.addEventListener("simulator:fit-view", fit)
    return () => { window.removeEventListener("simulator:fit-view", fit); window.clearTimeout(timer) }
  }, [dispatch])

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

  /**
   * Splits a wire where it was clicked and puts a junction there, then (per mode) ends the wire being
   * drawn on it, moves a dragged wire end onto it, or starts a new wire from it.
   */
  const joinAtWire = useCallback(
    (wireId: string, clientX: number, clientY: number, mode: "draft" | "rewire" | "branch"): boolean => {
      const rect = containerRef.current?.getBoundingClientRect()
      const wire = state.wires.find((w) => w.id === wireId)
      const info = wireRoutedRef.current.get(wireId)
      if (!rect || !wire || !info) return false
      const hit = nearestOnPolyline(info.routed, screenToWorld(clientX, clientY, viewport, rect))
      if (!hit) return false
      const split = splitWireAt(wire, info.routed, hit, info.fromEnd, info.toEnd)
      const base = { type: "INSERT_JUNCTION" as const, wireId, ...split }
      const pinId = junctionPinId(split.junction.id)

      if (mode === "branch") {
        if (state.wireDraft || state.rewireDraft) return false
        dispatch(base)
        dispatch({ type: "START_WIRE", fromComponentId: split.junction.id, fromPinId: pinId, cursorX: hit.point.x, cursorY: hit.point.y })
        return true
      }

      if (mode === "rewire") {
        const rewire = state.rewireDraft
        if (!rewire || rewire.wireId === wireId) return false
        dispatch({ ...base, connect: { kind: "rewire", wireId: rewire.wireId, endpoint: rewire.endpoint } })
        return true
      }

      const draft = state.wireDraft
      if (!draft) return false
      const fromComp = state.components.find((c) => c.id === draft.fromComponentId)
      const fromPin = fromComp ? getPinsForComponent(fromComp).find((p) => p.id === draft.fromPinId) : undefined
      if (!fromComp || !fromPin) return false
      let route: { style: "custom"; points: Point[] } | undefined
      if (draft.points.length > 0) {
        const start = leadOutPoint(pinAnchor(fromComp, fromPin))
        const bends = state.wireAngle === "90" ? closeOrthogonal(draft.points, start, hit.point) : draft.points
        route = { style: "custom", points: bends }
      }
      dispatch({
        ...base,
        connect: {
          kind: "add",
          wire: {
            id: generateId("wire"),
            fromComponentId: fromComp.id,
            fromPinId: fromPin.id,
            toComponentId: split.junction.id,
            toPinId: pinId,
            ...(route ? { route } : {}),
          },
        },
      })
      return true
    },
    [state.wires, state.wireDraft, state.rewireDraft, state.components, state.wireAngle, viewport, dispatch, getPinsForComponent]
  )

  /**
   * Where the wire being drawn would go for a pointer position: snapped onto the pin under the
   * cursor, or onto an allowed angle (per the toolbar's wire-angle mode) from the previous bend.
   */
  const resolveDraftPoint = useCallback(
    (clientX: number, clientY: number, precise: boolean) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !wireDraft) return null

      const hit = pinElementAt(clientX, clientY)
      const hoverComponentId = hit?.closest("[data-component-id]")?.getAttribute("data-component-id")
      const hoverPinId = hit?.getAttribute("data-pin-id")
      if (hoverComponentId && hoverPinId && !(hoverComponentId === wireDraft.fromComponentId && hoverPinId === wireDraft.fromPinId)) {
        const comp = state.components.find((c) => c.id === hoverComponentId)
        const pin = comp ? getPinsForComponent(comp).find((p) => p.id === hoverPinId) : undefined
        if (comp && pin) {
          const anchor = pinAnchor(comp, pin)
          return { x: anchor.x, y: anchor.y, hover: { componentId: comp.id, pinId: pin.id } }
        }
      }

      const world = screenToWorld(clientX, clientY, viewport, rect)

      // Over the body of another wire: snap onto it, the wire will end in a junction there.
      const overWire = wireIdAt(clientX, clientY)
      const wireInfo = overWire ? wireRoutedRef.current.get(overWire) : undefined
      const wireHit = wireInfo ? nearestOnPolyline(wireInfo.routed, world) : null
      if (wireHit) return { x: wireHit.point.x, y: wireHit.point.y, hover: null }

      const fromComp = state.components.find((c) => c.id === wireDraft.fromComponentId)
      const fromPin = fromComp ? getPinsForComponent(fromComp).find((p) => p.id === wireDraft.fromPinId) : undefined
      const last = wireDraft.points[wireDraft.points.length - 1]
      const prev = last ?? (fromComp && fromPin ? leadOutPoint(pinAnchor(fromComp, fromPin)) : null)
      const snapped = snapWirePoint(world, { prev, next: null, mode: state.wireAngle, zoom: viewport.zoom, precise })
      return { x: snapped.x, y: snapped.y, hover: null }
    },
    [wireDraft, state.components, state.wireAngle, viewport, getPinsForComponent]
  )

  // Keyboard shortcuts
  const duplicateSelected = useCallback(() => {
    if (!state.selectedComponentId) return
    const comp = state.components.find((c) => c.id === state.selectedComponentId)
    if (!comp) return
    const def = getComponentDefinition(comp.type)
    if (!def) return
    const copy: PlacedComponent = {
      id: generateId("comp"),
      type: comp.type,
      name: comp.name,
      x: snapToGrid(comp.x + GRID_SIZE * 2),
      y: snapToGrid(comp.y + GRID_SIZE * 2),
      rotation: comp.rotation,
      // Deep-clone so the copy's metadata (e.g. a potentiometer's wiper
      // position) doesn't stay aliased to the original's.
      metadata: JSON.parse(JSON.stringify(comp.metadata)),
    }
    dispatch({ type: "ADD_COMPONENT", component: copy })
  }, [state.selectedComponentId, state.components, dispatch])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return
      // The code editor (CodeMirror) has its own undo/redo history for the
      // sketch text -- don't let the canvas's circuit-level shortcuts
      // steal Ctrl/Cmd+Z etc. while someone is typing code.
      if (document.activeElement?.closest(".cm-editor")) return

      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
        return
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicateSelected()
        return
      }

      if ((e.key === "Delete" || e.key === "Backspace") && state.wireDraft) {
        e.preventDefault()
        if (state.wireDraft.points.length > 0) popWaypoint()
        else cancelWire()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedComponentId) {
          dispatch({ type: "REMOVE_COMPONENT", id: state.selectedComponentId })
        } else if (state.selectedWireId) {
          dispatch({ type: "REMOVE_WIRE", id: state.selectedWireId })
        }
      }
      if (!meta && !e.altKey && e.key.toLowerCase() === "r" && state.selectedComponentId) {
        e.preventDefault()
        dispatch({ type: "ROTATE_COMPONENT", id: state.selectedComponentId, counterClockwise: e.shiftKey })
        return
      }
      if (e.key === "Escape") {
        cancelWire()
        cancelRewire()
        dispatch({ type: "SELECT_COMPONENT", id: null })
        dispatch({ type: "SELECT_WIRE", id: null })
      }
      if (e.key === " " && !e.repeat) {
        e.preventDefault()
        if (!state.isRunning && !canRunRef.current) return
        dispatch({ type: "SET_RUNNING", isRunning: !state.isRunning })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    state.selectedComponentId,
    state.selectedWireId,
    state.isRunning,
    state.wireDraft,
    popWaypoint,
    dispatch,
    cancelWire,
    cancelRewire,
    undo,
    redo,
    duplicateSelected,
  ])

  // Touch devices can drag a part to an exact position, or tap a palette
  // item to add it at the center of the visible workbench.
  useEffect(() => {
    const addComponentAt = (type: string, clientX: number, clientY: number) => {
      if (!containerRef.current) return
      const def = getComponentDefinition(type)
      if (!def) return

      const rect = containerRef.current.getBoundingClientRect()
      const world = screenToWorld(clientX, clientY, viewport, rect)
      const component = createPlacedComponent(def, snapToGrid(world.x), snapToGrid(world.y))
      dispatch({ type: "ADD_COMPONENT", component })
    }

    const handleTouchDrop = (e: Event) => {
      const detail = (e as CustomEvent<{ type: string; clientX: number; clientY: number }>).detail
      if (!detail || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const isInside =
        detail.clientX >= rect.left &&
        detail.clientX <= rect.right &&
        detail.clientY >= rect.top &&
        detail.clientY <= rect.bottom
      if (isInside) addComponentAt(detail.type, detail.clientX, detail.clientY)
    }

    const handleAddComponent = (e: Event) => {
      const detail = (e as CustomEvent<{ type: string }>).detail
      if (!detail?.type || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      addComponentAt(detail.type, rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    window.addEventListener("simulator:touch-drop", handleTouchDrop)
    window.addEventListener("simulator:add-component", handleAddComponent)
    return () => {
      window.removeEventListener("simulator:touch-drop", handleTouchDrop)
      window.removeEventListener("simulator:add-component", handleAddComponent)
    }
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
      if (e.pointerType === "touch") {
        touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touchPoints.current.size === 2) {
          // A second finger just landed — switch into pinch mode and bail
          // out of whatever single-pointer gesture (drag/pan/wire) was
          // starting, since it would otherwise fight with the pinch.
          dragRef.current = null
          endPan()
          cancelWire()
          cancelRewire()
          const pts = Array.from(touchPoints.current.values())
          isPinching.current = true
          pinchStartDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
          pinchStartZoom.current = viewport.zoom
          return
        }
        if (touchPoints.current.size > 2) return
      }

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

      // Drawing a wire: a click on empty canvas lays a bend point instead of cancelling.
      if (wireDraft && e.button === 0) {
        const point = resolveDraftPoint(e.clientX, e.clientY, e.shiftKey)
        if (point && !point.hover) addWaypoint(point.x, point.y)
        return
      }

      dispatch({ type: "SELECT_COMPONENT", id: null })
      dispatch({ type: "SELECT_WIRE", id: null })
      cancelWire()
      cancelRewire()

      if (e.button === 0 || e.button === 1) {
        startPan(e.clientX, e.clientY)
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      }
    },
    [dispatch, cancelWire, cancelRewire, startPan, endPan, viewport.zoom, wireDraft, resolveDraftPoint, addWaypoint]
  )

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch" && touchPoints.current.has(e.pointerId)) {
        touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }

      if (isPinching.current && touchPoints.current.size === 2) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const pts = Array.from(touchPoints.current.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top
        const targetZoom = pinchStartZoom.current * (dist / pinchStartDist.current)
        setZoomAtPoint(targetZoom, midX, midY)
        return
      }

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
        const point = resolveDraftPoint(e.clientX, e.clientY, e.shiftKey)
        if (point) updateWireDraft(point.x, point.y, point.hover)
      }

      if (rewireDraft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const world = screenToWorld(e.clientX, e.clientY, viewport, rect)
        updateRewireDraft(world.x, world.y)
      }
    },
    [viewport, dispatch, movePan, isPanning, wireDraft, updateWireDraft, rewireDraft, updateRewireDraft, setZoomAtPoint, resolveDraftPoint]
  )

  const resolvePinTarget = useCallback((clientX: number, clientY: number) => {
    const pinElement = pinElementAt(clientX, clientY)
    if (!pinElement) return null
    const componentElement = pinElement.closest("[data-component-id]")
    const componentId = componentElement?.getAttribute("data-component-id")
    const pinId = pinElement.getAttribute("data-pin-id")
    if (!componentId || !pinId) return null
    return { componentId, pinId }
  }, [])

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") {
        touchPoints.current.delete(e.pointerId)
        if (touchPoints.current.size < 2) {
          isPinching.current = false
        }
        // A finger lifted mid-pinch — don't let the remaining single
        // pointer resume a pan/drag/wire-drop from its last position.
        if (touchPoints.current.size >= 1) {
          dragRef.current = null
          endPan()
          return
        }
      }

      dragRef.current = null
      endPan()

      if (state.rewireDraft) {
        const target = resolvePinTarget(e.clientX, e.clientY)
        const rewiring = state.wires.find((w) => w.id === state.rewireDraft!.wireId)
        const own = rewiring
          ? state.rewireDraft.endpoint === "from"
            ? { componentId: rewiring.fromComponentId, pinId: rewiring.fromPinId }
            : { componentId: rewiring.toComponentId, pinId: rewiring.toPinId }
          : null
        if (target && own && target.componentId === own.componentId && target.pinId === own.pinId) {
          // A plain click on a wire's end: the pin is free to take another wire, so start a new one from it.
          cancelRewire()
          startWire(target.componentId, target.pinId)
        } else if (target) {
          handlePinClick(target.componentId, target.pinId)
        } else {
          const overWire = wireIdAt(e.clientX, e.clientY)
          if (!overWire || !joinAtWire(overWire, e.clientX, e.clientY, "rewire")) cancelRewire()
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
    [endPan, cancelWire, cancelRewire, startWire, joinAtWire, state.wires, state.wireDraft, state.rewireDraft, resolvePinTarget, handlePinClick]
  )

  // Pressing a wire's end: while drawing, that is just clicking the pin (a pin can take many wires);
  // otherwise it grabs the end to move it.
  const handleEndpointPointerDown = useCallback(
    (wireId: string, endpoint: "from" | "to", componentId: string, pinId: string) => {
      if (state.wireDraft) handlePinClick(componentId, pinId)
      else startRewire(wireId, endpoint, componentId, pinId)
    },
    [state.wireDraft, handlePinClick, startRewire]
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
      className="absolute inset-0 z-0 overflow-hidden bg-canvas-bg"
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
        onContextMenu={(e) => {
          // Right-click while drawing undoes the last bend (or cancels the wire).
          if (!wireDraft) return
          e.preventDefault()
          if (wireDraft.points.length > 0) popWaypoint()
          else cancelWire()
        }}
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
            onEndpointPointerDown={handleEndpointPointerDown}
            routedRef={wireRoutedRef}
            onWireJoin={joinAtWire}
          />
        </g>
      </svg>

      <CanvasToolbar getSvg={() => svgRef.current} />

      <PartToolbar viewport={viewport} width={dimensions.width} height={dimensions.height} />

      {wireDraft && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[92%] -translate-x-1/2 rounded-full border border-border/70 bg-card/95 px-3.5 py-1.5 text-center text-[11px] text-muted-foreground shadow-lg backdrop-blur">
          <b className="text-foreground">Click</b> empty space to add a bend · <b className="text-foreground">click a pin</b> or a wire to finish · <b className="text-foreground">Backspace</b>/right-click removes the last bend · <b className="text-foreground">Shift</b> = free · <b className="text-foreground">Esc</b> cancels
        </div>
      )}

      <div
        aria-label="Built with SolderHub"
        className="pointer-events-none absolute bottom-3 right-3 z-10 select-none rounded-md border border-border/40 bg-background/65 px-2.5 py-1.5 text-right shadow-sm backdrop-blur-sm sm:bottom-4 sm:right-4"
      >
        <span className="block text-[10px] font-semibold tracking-wide text-foreground/65">Built with <span className="font-bold text-[#7DBBFF]">Solder</span><span className="font-bold text-[#FF8A24]">Hub</span></span>
      </div>

    </div>
  )
}
