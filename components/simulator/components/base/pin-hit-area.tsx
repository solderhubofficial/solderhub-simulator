"use client"

import { memo, useState } from "react"
import type { ComponentPin } from "@/types/simulator"
import { useViewportZoom } from "@/hooks/simulator/use-viewport-zoom"

interface PinHitAreaProps {
  pin: ComponentPin
  componentId: string
  onClick: () => void
  onPointerDown: (e: React.PointerEvent) => void
  radius?: number
}

// Screen-space touch target we aim for, in CSS px. Pins live inside the
// canvas's zoomed <g> transform, so a fixed world-unit radius shrinks to
// nothing once someone zooms out -- this compensates so a pin stays
// tappable at any zoom level, without inflating it into overlapping
// neighboring pins when zoomed in tight.
const TARGET_SCREEN_RADIUS = 11
const MAX_WORLD_RADIUS = 13

function PinHitAreaInner({
  pin,
  onClick,
  onPointerDown,
  radius = 7,
}: PinHitAreaProps) {
  const colorMap: Record<string, string> = {
    power: "#E74C3C",
    ground: "#3498DB",
    digital: "#F1C40F",
    analog: "#2ECC71",
    passive: "#AAA",
  }
  const [hovered, setHovered] = useState(false)
  const color = colorMap[pin.type] ?? "#AAA"
  const zoom = useViewportZoom()
  const hitRadius = Math.min(MAX_WORLD_RADIUS, Math.max(radius, TARGET_SCREEN_RADIUS / zoom))

  return (
    // Pins stay invisible at rest — the component leads already show where
    // they are — and only light up on hover/touch to confirm a connection
    // point, keeping the board free of a colored dot on every pin. The
    // visible dot stays at `radius`; the invisible hit area (`hitRadius`)
    // is what actually catches the tap/click and grows on zoom-out.
    <>
      {hitRadius > radius && (
        <circle
          cx={pin.x}
          cy={pin.y}
          r={hitRadius}
          fill="transparent"
          style={{ cursor: "crosshair", pointerEvents: "all" }}
          data-pin-id={pin.id}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            setHovered(true)
            onPointerDown(e)
          }}
          onPointerUp={() => setHovered(false)}
        />
      )}
      <circle
        cx={pin.x}
        cy={pin.y}
        r={radius}
        fill={hovered ? color : "transparent"}
        fillOpacity={hovered ? 0.8 : 0}
        stroke={hovered ? color : "transparent"}
        strokeWidth={1}
        style={{
          cursor: "crosshair",
          pointerEvents: hitRadius > radius ? "none" : "all",
        }}
        data-pin-id={pin.id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          setHovered(true)
          onPointerDown(e)
        }}
        onPointerUp={() => setHovered(false)}
      />
    </>
  )
}

export const PinHitArea = memo(PinHitAreaInner)
