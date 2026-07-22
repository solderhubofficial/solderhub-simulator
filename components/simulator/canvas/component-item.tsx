"use client"

import { memo, useCallback } from "react"
import type { PlacedComponent } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

interface PlacedComponentItemProps {
  component: PlacedComponent
  onPinClick: (componentId: string, pinId: string) => void
  onSelect: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
}

function PlacedComponentItemInner({
  component,
  onPinClick,
  onSelect,
  onDragStart,
}: PlacedComponentItemProps) {
  const { state, dispatch, getPinsForComponent, simulationResults } = useSimulator()
  const def = getComponentDefinition(component.type)
  if (!def) return null

  const pins = getPinsForComponent(component)
  const selected = state.selectedComponentId === component.id
  const simulation = simulationResults[component.id] ?? null
  const Renderer = def.Renderer

  const handlePinClick = useCallback(
    (pinId: string) => onPinClick(component.id, pinId),
    [component.id, onPinClick]
  )

  const handlePinPointerDown = useCallback(
    (pinId: string, e: React.PointerEvent) => {
      e.stopPropagation()
    },
    []
  )

  return (
    <g
      transform={`translate(${component.x}, ${component.y}) rotate(${component.rotation})`}
      data-component-id={component.id}
      style={{ cursor: "grab" }}
      onClick={(e) => {
        if (component.type === "push-button") {
          e.stopPropagation()
          dispatch({
            type: "UPDATE_METADATA",
            id: component.id,
            metadata: { pressed: component.metadata.pressed !== true },
          })
        }
      }}
      onPointerDown={(e) => {
        if ((e.target as Element).closest("[data-pin-id]")) return
        e.stopPropagation()
        onSelect(component.id)
        onDragStart(component.id, e)
      }}
    >
      <Renderer
        component={component}
        pins={pins}
        selected={selected}
        simulation={simulation}
        onPinClick={handlePinClick}
        onPinPointerDown={handlePinPointerDown}
      />
    </g>
  )
}

export const PlacedComponentItem = memo(PlacedComponentItemInner)
