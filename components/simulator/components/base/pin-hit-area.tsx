"use client"

import { memo, useState } from "react"
import type { ComponentPin } from "@/types/simulator"

interface PinHitAreaProps {
  pin: ComponentPin
  componentId: string
  onClick: () => void
  onPointerDown: (e: React.PointerEvent) => void
  radius?: number
}

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

  return (
    // Pins stay invisible at rest — the component leads already show where
    // they are — and only light up on hover/touch to confirm a connection
    // point, keeping the board free of a colored dot on every pin.
    <circle
      cx={pin.x}
      cy={pin.y}
      r={radius}
      fill={hovered ? color : "transparent"}
      fillOpacity={hovered ? 0.8 : 0}
      stroke={hovered ? color : "transparent"}
      strokeWidth={1}
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
  )
}

export const PinHitArea = memo(PinHitAreaInner)
