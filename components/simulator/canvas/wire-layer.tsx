"use client"

import { memo, useMemo } from "react"
import type { Wire } from "@/types/simulator"
import { buildWirePath, getPinWorldPosition } from "@/lib/simulator/utils/geometry"
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

function WireLayerInner({ wires, wireDraft, rewireDraft, onEndpointPointerDown }: WireLayerProps) {
  const { state, getPinsForComponent } = useSimulator()

  const wirePaths = useMemo(() => {
    return wires.map((wire) => {
      const fromComp = state.components.find((c) => c.id === wire.fromComponentId)
      const toComp = state.components.find((c) => c.id === wire.toComponentId)
      if (!fromComp || !toComp) return null

      const fromPins = getPinsForComponent(fromComp)
      const toPins = getPinsForComponent(toComp)
      const fromPin = fromPins.find((p) => p.id === wire.fromPinId)
      const toPin = toPins.find((p) => p.id === wire.toPinId)
      if (!fromPin || !toPin) return null

      const from = getPinWorldPosition(fromComp, fromPin)
      const to = getPinWorldPosition(toComp, toPin)

      return {
        id: wire.id,
        path: buildWirePath(from.x, from.y, to.x, to.y),
        selected: state.selectedWireId === wire.id,
        from: {
          componentId: fromComp.id,
          pinId: fromPin.id,
          x: from.x,
          y: from.y,
        },
        to: {
          componentId: toComp.id,
          pinId: toPin.id,
          x: to.x,
          y: to.y,
        },
      }
    }).filter(Boolean) as {
      id: string
      path: string
      selected: boolean
      from: { componentId: string; pinId: string; x: number; y: number }
      to: { componentId: string; pinId: string; x: number; y: number }
    }[]
  }, [wires, state.components, state.selectedWireId, getPinsForComponent])

  const draftPath = useMemo(() => {
    if (!wireDraft) return null
    const fromComp = state.components.find((c) => c.id === wireDraft.fromComponentId)
    if (!fromComp) return null
    const fromPins = getPinsForComponent(fromComp)
    const fromPin = fromPins.find((p) => p.id === wireDraft.fromPinId)
    if (!fromPin) return null
    const from = getPinWorldPosition(fromComp, fromPin)
    return buildWirePath(from.x, from.y, wireDraft.cursorX, wireDraft.cursorY)
  }, [wireDraft, state.components, getPinsForComponent])

  // While rewiring, anchor the dashed preview to the endpoint that is NOT
  // being dragged (the one staying put), stretching to the cursor — mirrors
  // draftPath above. Previously this drew a zero-length path at the cursor.
  const rewirePath = useMemo(() => {
    if (!rewireDraft) return null
    const wire = wires.find((w) => w.id === rewireDraft.wireId)
    if (!wire) return null
    const anchorComponentId =
      rewireDraft.endpoint === "from" ? wire.toComponentId : wire.fromComponentId
    const anchorPinId = rewireDraft.endpoint === "from" ? wire.toPinId : wire.fromPinId
    const anchorComp = state.components.find((c) => c.id === anchorComponentId)
    if (!anchorComp) return null
    const anchorPins = getPinsForComponent(anchorComp)
    const anchorPin = anchorPins.find((p) => p.id === anchorPinId)
    if (!anchorPin) return null
    const anchor = getPinWorldPosition(anchorComp, anchorPin)
    return buildWirePath(anchor.x, anchor.y, rewireDraft.cursorX, rewireDraft.cursorY)
  }, [rewireDraft, wires, state.components, getPinsForComponent])

  return (
    <g className="wire-layer">
      {wirePaths.map((w) => (
        <g key={w.id}>
          <path
            d={w.path}
            fill="none"
            stroke={w.selected ? "var(--wire-selected)" : "var(--wire-default)"}
            strokeWidth={w.selected ? 3 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={w.selected ? 1 : 0.85}
            style={{ pointerEvents: "stroke" }}
          />
          <circle
            cx={w.from.x}
            cy={w.from.y}
            r={4.5}
            fill={w.selected ? "var(--wire-selected)" : "var(--card)"}
            stroke={w.selected ? "var(--wire-selected)" : "var(--wire-default)"}
            strokeWidth={1.5}
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
            r={4.5}
            fill={w.selected ? "var(--wire-selected)" : "var(--card)"}
            stroke={w.selected ? "var(--wire-selected)" : "var(--wire-default)"}
            strokeWidth={1.5}
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
          {/* Invisible wider hit area for selection */}
          <path
            d={w.path}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            style={{ cursor: "pointer", pointerEvents: "stroke" }}
            data-wire-id={w.id}
          />
        </g>
      ))}
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
          opacity={0.7}
        />
      )}
    </g>
  )
}

export const WireLayer = memo(WireLayerInner)
