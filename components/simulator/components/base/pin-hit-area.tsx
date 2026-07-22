"use client"

import { memo } from "react"
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

  return (
    <g>
      <circle
        cx={pin.x}
        cy={pin.y}
        r={radius}
        fill={colorMap[pin.type] ?? "#AAA"}
        stroke="#333"
        strokeWidth={0.5}
        opacity={0.85}
        style={{ cursor: "crosshair" }}
        data-pin-id={pin.id}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onPointerDown(e)
        }}
      />
    </g>
  )
}

export const PinHitArea = memo(PinHitAreaInner)
