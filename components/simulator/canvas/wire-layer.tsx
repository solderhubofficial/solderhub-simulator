"use client"

import { memo, useMemo, useRef } from "react"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"
import { getComponentBounds, getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import {
  pinExitDirection,
  laneOffsets,
  roundedPointsToPath,
  routeWire,
  type Rect,
  type RouteEndpoint,
  type RouteHandle,
} from "@/lib/simulator/utils/wire-routing"
import { autoWireColor, normalizeWireColor, normalizeWireRoute, wireShades, WIRE_COLOR_PRESETS } from "@/lib/simulator/wire-colors"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

interface WireLayerProps {
  wires: Wire[]
  wireDraft: {
    fromComponentId: string
    fromPinId: string
    cursorX: number
    cursorY: number
  } | null
  rewireDraft: {
    wireId: string
    endpoint: "from" | "to"
    cursorX: number
    cursorY: number
  } | null
  onEndpointPointerDown: (wireId: string, endpoint: "from" | "to", componentId: string, pinId: string) => void
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
  routeStyle: "auto" | "hvh" | "vhv" | "straight"
  handle: RouteHandle | null
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

function WireLayerInner({ wires, wireDraft, rewireDraft, onEndpointPointerDown }: WireLayerProps) {
  const { state, dispatch, getPinsForComponent } = useSimulator()
  const zoom = state.viewport.zoom || 1
  const endpointHitRadius = Math.min(ENDPOINT_MAX_WORLD_RADIUS, Math.max(4.5, ENDPOINT_TARGET_SCREEN_RADIUS / zoom))
  const wireHitWidth = Math.min(WIRE_MAX_WORLD_WIDTH, Math.max(12, WIRE_TARGET_SCREEN_WIDTH / zoom))
  const handleDragRef = useRef<HandleDrag | null>(null)

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

      out.push({
        id: wire.id,
        path: roundedPointsToPath(routed.points),
        selected: state.selectedWireId === wire.id,
        color: normalizeWireColor(wire.color),
        autoColor: autoWireColor(fromPin, toPin, wire.id),
        routeStyle: normalizeWireRoute(wire.route)?.style ?? "auto",
        handle: routed.handle,
        from: { componentId: fromComp.id, pinId: fromPin.id, x: from.x, y: from.y },
        to: { componentId: toComp.id, pinId: toPin.id, x: to.x, y: to.y },
      })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wires, state.components, state.selectedWireId, getPinsForComponent, boundsById, obstacles])

  const draftPath = useMemo(() => {
    if (!wireDraft) return null
    const fromComp = state.components.find((c) => c.id === wireDraft.fromComponentId)
    if (!fromComp) return null
    const fromPin = getPinsForComponent(fromComp).find((p) => p.id === wireDraft.fromPinId)
    if (!fromPin) return null
    const from = endpointFor(fromComp, fromPin)
    const cursor: RouteEndpoint = { x: wireDraft.cursorX, y: wireDraft.cursorY, dir: null }
    return roundedPointsToPath(routeWire(from, cursor, obstacles).points)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wireDraft, state.components, getPinsForComponent, boundsById, obstacles])

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
          />

          {w.selected && (
            <foreignObject
              x={(w.handle?.x ?? ((w.from.x + w.to.x) / 2)) - 112}
              y={(w.handle?.y ?? ((w.from.y + w.to.y) / 2)) - 82}
              width={224}
              height={76}
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
                    ["straight", "Straight"],
                  ] as const).map(([style, label]) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={w.routeStyle === style}
                      onClick={() => dispatch({
                        type: "UPDATE_WIRE",
                        id: w.id,
                        patch: { route: style === "auto" ? null : { style } },
                      })}
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
              </div>
            </foreignObject>
          )}
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
        <path
          d={draftPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
      )}
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
        />
      )}
    </g>
  )
}

export const WireLayer = memo(WireLayerInner)
