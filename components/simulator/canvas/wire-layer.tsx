"use client"

import { pinElementAt } from "./pin-hit-test"
import { memo, useMemo, useRef, useState } from "react"
import type { ComponentPin, PlacedComponent, Wire, WireAngleMode, WireDraft, WireRouteStyle } from "@/types/simulator"
import { getComponentBounds, getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import {
  customChain,
  pinExitDirection,
  laneOffsets,
  offsetForOrientation,
  roundedPointsToPath,
  routeWire,
  simplifyPoints,
  stubEnd,
  type Point,
  type Rect,
  type RouteEndpoint,
  type RouteHandle,
} from "@/lib/simulator/utils/wire-routing"
import { autoWireColor, normalizeWireColor, normalizeWireRoute, wireShades, WIRE_COLOR_PRESETS } from "@/lib/simulator/wire-colors"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { closeOrthogonal, customRoute, insertBend, removeBend } from "@/lib/simulator/utils/wire-waypoints"
import { segmentAngle, snapWirePoint } from "@/lib/simulator/utils/wire-snap"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

interface WireLayerProps {
  wires: Wire[]
  wireDraft: WireDraft | null
  rewireDraft: {
    wireId: string
    endpoint: "from" | "to"
    cursorX: number
    cursorY: number
  } | null
  onEndpointPointerDown: (wireId: string, endpoint: "from" | "to", componentId: string, pinId: string) => void
  /** Filled with each wire's drawn polyline so the canvas can split a wire where it is clicked. */
  routedRef: React.MutableRefObject<Map<string, { routed: Point[]; fromEnd: RouteEndpoint; toEnd: RouteEndpoint }>>
  /** A wire body was pressed while drawing ("draft") or double-clicked ("branch"). Returns true when handled. */
  onWireJoin: (wireId: string, clientX: number, clientY: number, mode: "draft" | "branch") => boolean
}

// Screen-space targets (CSS px) the wire hit areas compensate toward as the
// canvas zooms out -- mirrors the approach in PinHitArea so endpoints and
// wire bodies stay tappable on touch at any zoom level.
const ENDPOINT_TARGET_SCREEN_RADIUS = 11
const ENDPOINT_MAX_WORLD_RADIUS = 13
const WIRE_TARGET_SCREEN_WIDTH = 22
const WIRE_MAX_WORLD_WIDTH = 26
/** Dragged bends snap to this grid (half of the main 20px grid). */
const HANDLE_SNAP = 10

interface RenderedWire {
  id: string
  path: string
  selected: boolean
  /** Custom "#rrggbb" color the user picked, or null for automatic. */
  color: string | null
  /** Colour used when none is picked: by pin type (power, ground, clock, data...). */
  autoColor: string
  routeStyle: WireRouteStyle
  handle: RouteHandle | null
  /** The user's bend points when the wire has a custom route, else null. */
  bends: Point[] | null
  /** Angle mode a custom route was drawn in. */
  angle: WireAngleMode
  /** The wire's rendered polyline, used to offer "+" handles and to convert auto routes to custom. */
  routed: Point[]
  /** Unsimplified pin -> lead-out -> bends -> lead-out -> pin chain for custom wires. */
  chain: Point[] | null
  fromEnd: RouteEndpoint
  toEnd: RouteEndpoint
  from: { componentId: string; pinId: string; x: number; y: number }
  to: { componentId: string; pinId: string; x: number; y: number }
}

interface HandleDrag {
  wireId: string
  pointerStart: number
  midStart: number
  axis: "x" | "y"
  orientation: "hvh" | "vhv"
  baseMid: number
}

function WireLayerInner({ wires, wireDraft, rewireDraft, onEndpointPointerDown, routedRef, onWireJoin }: WireLayerProps) {
  const { state, dispatch, getPinsForComponent } = useSimulator()
  const zoom = state.viewport.zoom || 1
  const endpointHitRadius = Math.min(ENDPOINT_MAX_WORLD_RADIUS, Math.max(4.5, ENDPOINT_TARGET_SCREEN_RADIUS / zoom))
  const wireHitWidth = Math.min(WIRE_MAX_WORLD_WIDTH, Math.max(12, WIRE_TARGET_SCREEN_WIDTH / zoom))
  const handleDragRef = useRef<HandleDrag | null>(null)
  const [dragLabel, setDragLabel] = useState<{ x: number; y: number; text: string } | null>(null)

  // World-space bounds of every part. Wires route around these and leave each
  // pin through the nearest edge of its own part.
  const boundsById = useMemo(() => {
    const map = new Map<string, Rect>()
    for (const component of state.components) {
      const def = getComponentDefinition(component.type)
      if (def) map.set(component.id, getComponentBounds(component, def.width, def.height))
    }
    return map
  }, [state.components])
  const obstacles = useMemo(() => Array.from(boundsById.values()), [boundsById])

  const endpointFor = (component: PlacedComponent, pin: ComponentPin): RouteEndpoint => {
    const pos = getPinWorldPosition(component, pin)
    const bounds = boundsById.get(component.id)
    if (component.type === "junction") return { x: pos.x, y: pos.y, dir: null }
    return { x: pos.x, y: pos.y, dir: bounds ? pinExitDirection(pos, bounds) : null }
  }

  const wirePaths = useMemo(() => {
    const out: RenderedWire[] = []
    const lanes = laneOffsets(wires)
    for (const wire of wires) {
      const fromComp = state.components.find((c) => c.id === wire.fromComponentId)
      const toComp = state.components.find((c) => c.id === wire.toComponentId)
      if (!fromComp || !toComp) continue

      const fromPin = getPinsForComponent(fromComp).find((p) => p.id === wire.fromPinId)
      const toPin = getPinsForComponent(toComp).find((p) => p.id === wire.toPinId)
      if (!fromPin || !toPin) continue

      const from = endpointFor(fromComp, fromPin)
      const to = endpointFor(toComp, toPin)
      // Wires with their own route keep it; otherwise parallel wires between
      // the same two parts are nudged onto separate lanes so they don't overlap.
      const lane = lanes.get(wire.id) ?? 0
      const route = normalizeWireRoute(wire.route) ?? (lane !== 0 ? { style: "auto" as const, offset: lane } : null)
      const routed = routeWire(from, to, obstacles, route)
      const customBends = route?.style === "custom" && route.points && route.points.length > 0 ? route.points : null

      out.push({
        id: wire.id,
        path: roundedPointsToPath(routed.points),
        selected: state.selectedWireId === wire.id,
        color: normalizeWireColor(wire.color),
        autoColor: autoWireColor(fromPin, toPin, wire.id),
        routeStyle: normalizeWireRoute(wire.route)?.style ?? "auto",
        handle: routed.handle,
        bends: customBends,
        angle: route?.angle ?? "90",
        routed: routed.points,
        chain: customBends ? customChain(from, to, customBends) : null,
        fromEnd: from,
        toEnd: to,
        from: { componentId: fromComp.id, pinId: fromPin.id, x: from.x, y: from.y },
        to: { componentId: toComp.id, pinId: toPin.id, x: to.x, y: to.y },
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wires, state.components, state.selectedWireId, getPinsForComponent, boundsById, obstacles])

  routedRef.current = new Map(wirePaths.map((w) => [w.id, { routed: w.routed, fromEnd: w.fromEnd, toEnd: w.toEnd }]))

  const draftPath = useMemo(() => {
    if (!wireDraft) return null
    const fromComp = state.components.find((c) => c.id === wireDraft.fromComponentId)
    if (!fromComp) return null
    const fromPin = getPinsForComponent(fromComp).find((p) => p.id === wireDraft.fromPinId)
    if (!fromPin) return null
    const from = endpointFor(fromComp, fromPin)
    const cursor: RouteEndpoint = { x: wireDraft.cursorX, y: wireDraft.cursorY, dir: null }

    let target: RouteEndpoint | null = null
    if (wireDraft.hover) {
      const toComp = state.components.find((c) => c.id === wireDraft.hover!.componentId)
      const toPin = toComp ? getPinsForComponent(toComp).find((p) => p.id === wireDraft.hover!.pinId) : undefined
      if (toComp && toPin) target = endpointFor(toComp, toPin)
    }

    const bends = wireDraft.points
    // No bends yet and hovering a pin: preview the automatic route the wire will get.
    if (bends.length === 0 && target) return { d: roundedPointsToPath(routeWire(from, target, obstacles).points), bends, label: null as null | { x: number; y: number; text: string } }

    let chain: Point[]
    if (target) {
      const finalBends = state.wireAngle === "90"
        ? closeOrthogonal(bends, from.dir ? stubEnd(from) : from, target.dir ? stubEnd(target) : target)
        : bends
      chain = customChain(from, target, finalBends)
    } else {
      chain = customChain(from, cursor, bends)
    }
    const points = simplifyPoints(chain)
    let label: { x: number; y: number; text: string } | null = null
    if (!target && chain.length >= 2) {
      const prev = chain[chain.length - 2]
      label = { x: cursor.x, y: cursor.y, text: `${segmentAngle(prev, cursor)}° · ${Math.round(Math.hypot(cursor.x - prev.x, cursor.y - prev.y))} px` }
    }
    return { d: roundedPointsToPath(points), bends, label }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wireDraft, state.wireAngle, state.components, getPinsForComponent, boundsById, obstacles])

  // While rewiring, anchor the dashed preview to the endpoint that is NOT
  // being dragged (the one staying put), stretching to the cursor.
  const rewirePath = useMemo(() => {
    if (!rewireDraft) return null
    const wire = wires.find((w) => w.id === rewireDraft.wireId)
    if (!wire) return null
    const anchorComponentId =
      rewireDraft.endpoint === "from" ? wire.toComponentId : wire.fromComponentId
    const anchorPinId = rewireDraft.endpoint === "from" ? wire.toPinId : wire.fromPinId
    const anchorComp = state.components.find((c) => c.id === anchorComponentId)
    if (!anchorComp) return null
    const anchorPin = getPinsForComponent(anchorComp).find((p) => p.id === anchorPinId)
    if (!anchorPin) return null
    const anchor = endpointFor(anchorComp, anchorPin)
    const cursor: RouteEndpoint = { x: rewireDraft.cursorX, y: rewireDraft.cursorY, dir: null }
    return roundedPointsToPath(routeWire(anchor, cursor, obstacles).points)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewireDraft, wires, state.components, getPinsForComponent, boundsById, obstacles])

  /**
   * Drags one bend point of a wire. Dragging a "+" handle first inserts a new bend; dragging a handle
   * on an automatically routed wire first converts it to a custom route with the current corners.
   * Listeners live on `window` so the drag survives the handle being re-rendered under the pointer.
   */
  const startBendDrag = (
    e: React.PointerEvent,
    w: RenderedWire,
    opts: { index: number } | { insertAt: number; at: Point }
  ) => {
    e.stopPropagation()
    e.preventDefault()
    // A non-history action: makes this gesture its own undo step.
    dispatch({ type: "SELECT_WIRE", id: w.id })

    let points: Point[] = w.bends ? w.bends.map((p) => ({ ...p })) : w.routed.slice(1, -1).map((p) => ({ ...p }))
    let index: number
    if ("insertAt" in opts) {
      points = insertBend(points, opts.insertAt, opts.at)
      index = Math.max(0, Math.min(points.length - 1, opts.insertAt))
    } else {
      index = opts.index
    }
    dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { route: customRoute(points, state.wireAngle) } })

    const leadFrom: Point = w.fromEnd.dir ? stubEnd(w.fromEnd) : { x: w.fromEnd.x, y: w.fromEnd.y }
    const leadTo: Point = w.toEnd.dir ? stubEnd(w.toEnd) : { x: w.toEnd.x, y: w.toEnd.y }
    const prev = index > 0 ? points[index - 1] : leadFrom
    const next = index < points.length - 1 ? points[index + 1] : leadTo
    const origin = points[index]
    const startX = e.clientX
    const startY = e.clientY
    const mode = state.wireAngle
    const dragZoom = zoom

    const move = (ev: PointerEvent) => {
      const raw = { x: origin.x + (ev.clientX - startX) / dragZoom, y: origin.y + (ev.clientY - startY) / dragZoom }
      const snapped = snapWirePoint(raw, { prev, next, mode, zoom: dragZoom, precise: ev.shiftKey })
      points = points.map((p, i) => (i === index ? snapped : p))
      dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { route: customRoute(points, state.wireAngle) } })
      setDragLabel({ x: snapped.x, y: snapped.y, text: `${segmentAngle(prev, snapped)}° · ${Math.round(Math.hypot(snapped.x - prev.x, snapped.y - prev.y))} px` })
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      setDragLabel(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  const removeBendAt = (w: RenderedWire, index: number) => {
    if (!w.bends) return
    const next = removeBend(w.bends, index)
    dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { route: next.length > 0 ? customRoute(next, w.angle) : null } })
  }

  const startHandleDrag = (e: React.PointerEvent, wireId: string, handle: RouteHandle) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    handleDragRef.current = {
      wireId,
      pointerStart: handle.axis === "x" ? e.clientX : e.clientY,
      midStart: handle.mid,
      axis: handle.axis,
      orientation: handle.orientation,
      baseMid: handle.baseMid,
    }
  }

  const moveHandleDrag = (e: React.PointerEvent) => {
    const drag = handleDragRef.current
    if (!drag) return
    const pointer = drag.axis === "x" ? e.clientX : e.clientY
    const mid = Math.round((drag.midStart + (pointer - drag.pointerStart) / zoom) / HANDLE_SNAP) * HANDLE_SNAP
    dispatch({
      type: "UPDATE_WIRE",
      id: drag.wireId,
      patch: { route: { style: drag.orientation, offset: mid - drag.baseMid } },
    })
  }

  const endHandleDrag = (e: React.PointerEvent) => {
    handleDragRef.current = null
    const el = e.currentTarget as Element
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
  }

  return (
    <g className="wire-layer">
      {wirePaths.map((w) => {
        const paint = w.color ?? w.autoColor
        const shades = wireShades(paint)
        return (
        <g key={w.id}>
          {/* Soft contact shadow */}
          <path d={w.path} fill="none" stroke="#000000" strokeOpacity={0.28} strokeWidth={5.4} strokeLinecap="round" strokeLinejoin="round" transform="translate(0.8 1.6)" style={{ pointerEvents: "none" }} />
          {/* Selection halo */}
          {w.selected && (
            <path d={w.path} fill="none" stroke="var(--wire-selected)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} style={{ pointerEvents: "none" }} />
          )}
          {/* Insulation: edge, colour, shine */}
          <path d={w.path} fill="none" stroke={shades.casing} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "stroke" }} />
          <path d={w.path} fill="none" stroke={paint} strokeWidth={3.1} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }} />
          <path d={w.path} fill="none" stroke={shades.shine} strokeOpacity={0.5} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" transform="translate(-0.5 -0.7)" style={{ pointerEvents: "none" }} />
          {endpointHitRadius > 4.5 && (
            <>
              <circle
                cx={w.from.x}
                cy={w.from.y}
                r={endpointHitRadius}
                fill="transparent"
                style={{ cursor: "grab" }}
                data-wire-id={w.id}
                data-endpoint="from"
                data-component-id={w.from.componentId}
                data-pin-id={w.from.pinId}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onEndpointPointerDown(w.id, "from", w.from.componentId, w.from.pinId)
                }}
              />
              <circle
                cx={w.to.x}
                cy={w.to.y}
                r={endpointHitRadius}
                fill="transparent"
                style={{ cursor: "grab" }}
                data-wire-id={w.id}
                data-endpoint="to"
                data-component-id={w.to.componentId}
                data-pin-id={w.to.pinId}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onEndpointPointerDown(w.id, "to", w.to.componentId, w.to.pinId)
                }}
              />
            </>
          )}
          <circle cx={w.from.x} cy={w.from.y} r={4.3} fill={shades.casing} style={{ pointerEvents: "none" }} />
          <circle
            cx={w.from.x}
            cy={w.from.y}
            r={3.2}
            fill="url(#sim-steel)"
            stroke={w.selected ? "var(--wire-selected)" : "#5f656c"}
            strokeWidth={w.selected ? 1.3 : 0.7}
            style={{ cursor: "grab", pointerEvents: endpointHitRadius > 4.5 ? "none" : "all" }}
            data-wire-id={w.id}
            data-endpoint="from"
            data-component-id={w.from.componentId}
            data-pin-id={w.from.pinId}
            onPointerDown={(e) => {
              e.stopPropagation()
              onEndpointPointerDown(w.id, "from", w.from.componentId, w.from.pinId)
            }}
          />
          <circle cx={w.to.x} cy={w.to.y} r={4.3} fill={shades.casing} style={{ pointerEvents: "none" }} />
          <circle
            cx={w.to.x}
            cy={w.to.y}
            r={3.2}
            fill="url(#sim-steel)"
            stroke={w.selected ? "var(--wire-selected)" : "#5f656c"}
            strokeWidth={w.selected ? 1.3 : 0.7}
            style={{ cursor: "grab", pointerEvents: endpointHitRadius > 4.5 ? "none" : "all" }}
            data-wire-id={w.id}
            data-endpoint="to"
            data-component-id={w.to.componentId}
            data-pin-id={w.to.pinId}
            onPointerDown={(e) => {
              e.stopPropagation()
              onEndpointPointerDown(w.id, "to", w.to.componentId, w.to.pinId)
            }}
          />
          {/* Invisible wider hit area for selection -- widens further on
              zoom-out so the wire body stays easy to tap on touch. */}
          <path
            d={w.path}
            fill="none"
            stroke="transparent"
            strokeWidth={wireHitWidth}
            style={{ cursor: "pointer", pointerEvents: "stroke" }}
            data-wire-id={w.id}
            data-wire-hit="true"
            onDoubleClick={(e) => {
              if (pinElementAt(e.clientX, e.clientY)) return
              if (onWireJoin(w.id, e.clientX, e.clientY, "branch")) e.stopPropagation()
            }}
            onPointerDown={(e) => {
              // A wire passing over a component pin must not swallow the pin: forward the press to it.
              const pin = pinElementAt(e.clientX, e.clientY)
              if (!pin) {
                // Drawing a wire and pressing on another wire's body: join onto it with a junction.
                if (wireDraft && onWireJoin(w.id, e.clientX, e.clientY, "draft")) e.stopPropagation()
                return
              }
              e.stopPropagation()
              pin.dispatchEvent(new PointerEvent("pointerdown", {
                bubbles: true, cancelable: true, composed: true,
                pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary,
                button: e.button, buttons: e.buttons, clientX: e.clientX, clientY: e.clientY,
                shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey,
              }))
            }}
            onClick={(e) => {
              const pin = pinElementAt(e.clientX, e.clientY)
              if (!pin) return
              e.stopPropagation()
              pin.dispatchEvent(new MouseEvent("click", {
                bubbles: true, cancelable: true, composed: true,
                button: e.button, clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey,
              }))
            }} />

          {w.selected && (
            <foreignObject
              x={(w.handle?.x ?? ((w.from.x + w.to.x) / 2)) - 112}
              y={(w.handle?.y ?? ((w.from.y + w.to.y) / 2)) - 120}
              width={224}
              height={110}
              style={{ overflow: "visible" }}
            >
              <div
                className="flex flex-col gap-1.5 rounded-lg border border-slate-300 bg-white p-2 text-slate-800 shadow-xl"
                style={{ fontFamily: "Arial, sans-serif", fontSize: 10, pointerEvents: "auto" }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 700, marginRight: 2 }}>Wire</span>
                  {WIRE_COLOR_PRESETS.slice(0, 7).map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.name}
                      aria-label={preset.name + " wire color"}
                      onClick={() => dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { color: preset.hex } })}
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: 99,
                        border: w.color === preset.hex ? "2px solid #111827" : "1px solid #9ca3af",
                        background: preset.hex,
                        padding: 0,
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Custom wire color"
                    title="Custom wire color"
                    value={w.color ?? "#1e88e5"}
                    onChange={(e) => dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { color: e.target.value } })}
                    style={{ width: 18, height: 18, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                  />
                  <button
                    type="button"
                    title="Delete wire"
                    aria-label="Delete wire"
                    onClick={() => dispatch({ type: "REMOVE_WIRE", id: w.id })}
                    style={{ marginLeft: "auto", color: "#dc2626", fontWeight: 700, fontSize: 15, lineHeight: "14px", padding: "0 3px", cursor: "pointer" }}
                  >×</button>
                </div>
                <div className="flex items-center gap-1">
                  {([
                    ["auto", "Auto"],
                    ["hvh", "Horizontal"],
                    ["vhv", "Vertical"],
                    ["straight", "Direct"],
                  ] as const).map(([style, label]) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={w.routeStyle === style}
                      onClick={() => {
                        // Horizontal/Vertical start where the automatic route already runs, so the wire doesn't jump.
                        const offset = style === "hvh" || style === "vhv"
                          ? w.handle && w.handle.orientation === style
                            ? Math.round((w.handle.mid - w.handle.baseMid) * 2) / 2
                            : offsetForOrientation(style, w.fromEnd, w.toEnd, obstacles)
                          : 0
                        dispatch({
                          type: "UPDATE_WIRE",
                          id: w.id,
                          patch: { route: style === "auto" ? null : offset !== 0 ? { style, offset } : { style } },
                        })
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        borderRadius: 4,
                        border: w.routeStyle === style ? "1px solid #2563eb" : "1px solid #d1d5db",
                        background: w.routeStyle === style ? "#dbeafe" : "#f9fafb",
                        color: "#1f2937",
                        padding: "4px 2px",
                        fontSize: 9,
                        cursor: "pointer",
                      }}
                    >{label}</button>
                  ))}
                </div>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 9, lineHeight: 1.35 }}>
                  {w.bends ? `Custom route · ${w.bends.length} bend${w.bends.length === 1 ? "" : "s"}. ` : ""}
                  Drag ◆ to move a bend, drag + to add one, double-click a bend to remove it. Hold Shift to place freely.
                </p>
              </div>
            </foreignObject>
          )}
          {/* Custom bends: drag to move, double-click to remove. */}
          {w.selected && w.bends && w.bends.map((bend, k) => (
            <g
              key={`bend-${k}`}
              style={{ cursor: "move", touchAction: "none" }}
              onPointerDown={(e) => startBendDrag(e, w, { index: k })}
              onDoubleClick={(e) => { e.stopPropagation(); removeBendAt(w, k) }}
            >
              <circle cx={bend.x} cy={bend.y} r={Math.max(9, endpointHitRadius)} fill="transparent" />
              <circle cx={bend.x} cy={bend.y} r={5} fill="var(--card)" stroke="var(--wire-selected)" strokeWidth={2} />
            </g>
          ))}
          {/* "+" handles on every segment: drag to pull out a new bend. */}
          {w.selected && (() => {
            const segs = w.chain ?? w.routed
            const offset = w.chain ? 1 + (w.fromEnd.dir ? 1 : 0) : 0
            return segs.slice(0, -1).map((a, i) => {
              const b = segs[i + 1]
              const length = Math.hypot(b.x - a.x, b.y - a.y)
              if (length < 18) return null
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
              if (w.handle && Math.hypot(mid.x - w.handle.x, mid.y - w.handle.y) < 8) return null
              const insertAt = w.chain ? i + 1 - offset : i
              return (
                <g
                  key={`add-${i}`}
                  style={{ cursor: "copy", touchAction: "none" }}
                  onPointerDown={(e) => startBendDrag(e, w, { insertAt, at: mid })}
                >
                  <circle cx={mid.x} cy={mid.y} r={Math.max(8, endpointHitRadius)} fill="transparent" />
                  <circle cx={mid.x} cy={mid.y} r={4.2} fill="var(--card)" stroke="var(--wire-selected)" strokeWidth={1.3} opacity={0.9} />
                  <path d={`M ${mid.x - 2} ${mid.y} H ${mid.x + 2} M ${mid.x} ${mid.y - 2} V ${mid.y + 2}`} stroke="var(--wire-selected)" strokeWidth={1.2} strokeLinecap="round" />
                </g>
              )
            })
          })()}
          {/* Bend handle: drag to slide the wire's middle segment, double-click to reset. */}
          {w.selected && w.handle && (
            <g
              style={{ cursor: w.handle.axis === "x" ? "ew-resize" : "ns-resize", touchAction: "none" }}
              onPointerDown={(e) => startHandleDrag(e, w.id, w.handle!)}
              onPointerMove={moveHandleDrag}
              onPointerUp={endHandleDrag}
              onPointerCancel={endHandleDrag}
              onDoubleClick={(e) => {
                e.stopPropagation()
                dispatch({ type: "UPDATE_WIRE", id: w.id, patch: { route: null } })
              }}
            >
              <circle cx={w.handle.x} cy={w.handle.y} r={Math.max(9, endpointHitRadius)} fill="transparent" />
              <rect
                x={w.handle.x - 4.5}
                y={w.handle.y - 4.5}
                width={9}
                height={9}
                rx={2}
                transform={`rotate(45 ${w.handle.x} ${w.handle.y})`}
                fill="var(--card)"
                stroke="var(--wire-selected)"
                strokeWidth={1.8}
              />
            </g>
          )}
        </g>
        )
      })}
      {draftPath && (
        <>
          <path d={draftPath.d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} style={{ pointerEvents: "none" }} />
          {draftPath.bends.map((bend, i) => (
            <circle key={i} cx={bend.x} cy={bend.y} r={3.8} fill="var(--card)" stroke="var(--primary)" strokeWidth={1.8} style={{ pointerEvents: "none" }} />
          ))}
          {draftPath.label && <AngleLabel x={draftPath.label.x} y={draftPath.label.y} text={draftPath.label.text} zoom={zoom} />}
        </>
      )}
      {dragLabel && <AngleLabel x={dragLabel.x} y={dragLabel.y} text={dragLabel.text} zoom={zoom} />}
      {rewirePath && (
        <path
          d={rewirePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  )
}

/** Small readout next to a bend being placed or dragged: segment angle and length. */
function AngleLabel({ x, y, text, zoom }: { x: number; y: number; text: string; zoom: number }) {
  const size = 11 / zoom
  const width = text.length * size * 0.6 + 10 / zoom
  const height = size + 7 / zoom
  return (
    <g style={{ pointerEvents: "none" }} transform={`translate(${x + 12 / zoom} ${y - 14 / zoom})`}>
      <rect x={0} y={-height + 2 / zoom} width={width} height={height} rx={4 / zoom} fill="#0b1220" opacity={0.92} />
      <text x={5 / zoom} y={-3 / zoom} fontSize={size} fontFamily="ui-monospace, monospace" fill="#e6f0ff">{text}</text>
    </g>
  )
}

export const WireLayer = memo(WireLayerInner)
