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
  const isMomentaryButton = component.type === "push-button"

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

  const setButtonPressed = useCallback(
    (pressed: boolean) => {
      if (!isMomentaryButton) return
      dispatch({
        type: "UPDATE_METADATA",
        id: component.id,
        metadata: { pressed },
      })
    },
    [component.id, dispatch, isMomentaryButton]
  )

  return (
    <g
      transform={`translate(${component.x}, ${component.y}) rotate(${component.rotation})`}
      data-component-id={component.id}
      filter={selected ? "url(#sim-selected-glow)" : undefined}
      className="origin-center animate-in fade-in zoom-in-95 duration-150"
      style={{ cursor: isMomentaryButton ? "pointer" : "grab", touchAction: "none" }}
      role={isMomentaryButton ? "button" : undefined}
      tabIndex={isMomentaryButton ? 0 : undefined}
      aria-label={isMomentaryButton ? "Push button. Press and hold to close the circuit." : undefined}
      aria-pressed={isMomentaryButton ? component.metadata.pressed === true : undefined}
      onClick={(e) => {
        if (component.type === "push-button") {
          // Momentary buttons are handled by pointer/key down and up, not click-toggle.
          e.stopPropagation()
          return
        }
        if (component.type === "slide-switch") {
          e.stopPropagation()
          dispatch({
            type: "UPDATE_METADATA",
            id: component.id,
            metadata: { on: component.metadata.on !== true },
          })
        }
      }}
      onKeyDown={(e) => {
        if (!isMomentaryButton || (e.key !== " " && e.key !== "Enter") || e.repeat) return
        e.preventDefault()
        e.stopPropagation()
        setButtonPressed(true)
      }}
      onKeyUp={(e) => {
        if (!isMomentaryButton || (e.key !== " " && e.key !== "Enter")) return
        e.preventDefault()
        e.stopPropagation()
        setButtonPressed(false)
      }}
      onBlur={() => setButtonPressed(false)}
      onPointerDown={(e) => {
        if ((e.target as Element).closest("[data-pin-id]")) return
        e.stopPropagation()
        onSelect(component.id)

        if (isMomentaryButton) {
          e.preventDefault()
          // Capture the pointer so releasing outside the component still lets
          // us return the plunger to its raised position.
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // Pointer capture is not available in every embedded SVG context.
          }
          setButtonPressed(true)
          return
        }

        onDragStart(component.id, e)
      }}
      onPointerUp={(e) => {
        if (!isMomentaryButton) return
        e.stopPropagation()
        setButtonPressed(false)
      }}
      onPointerCancel={() => setButtonPressed(false)}
      onLostPointerCapture={() => setButtonPressed(false)}
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
