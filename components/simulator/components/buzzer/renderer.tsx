"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function BuzzerRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isActive = simulation?.flags.isActive === true

  return (
    <g data-component-id={component.id}>
      {/* Wire leads — red (+) / black (-) */}
      <line x1={17} y1={44} x2={17} y2={64} stroke="#d43b3b" strokeWidth={2} />
      <line x1={33} y1={44} x2={33} y2={58} stroke="#222" strokeWidth={2} />

      {/* Disc body */}
      <circle
        cx={25}
        cy={22}
        r={20}
        fill="#1c1c1c"
        stroke={selected ? "var(--primary)" : "#000"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow-sm)"
      />
      {/* Metallic rim highlight */}
      <circle cx={25} cy={22} r={20} fill="none" stroke="#555" strokeWidth={1} opacity={0.5} />
      <ellipse cx={18} cy={14} rx={5} ry={3} fill="#ffffff" opacity={0.12} />
      {/* Center vent hole */}
      <circle cx={25} cy={22} r={5} fill={isActive ? "#f0a000" : "#000"} stroke="#333" />
      <circle cx={25} cy={22} r={1.6} fill="#000" opacity={0.6} />

      {isActive && (
        <>
          <circle cx={25} cy={22} r={25} fill="none" stroke="#f0a000" strokeWidth={1} opacity={0.45} />
          <circle cx={25} cy={22} r={30} fill="none" stroke="#f0a000" strokeWidth={0.75} opacity={0.25} />
        </>
      )}

      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(e) => onPinPointerDown(pin.id, e)}
        />
      ))}
    </g>
  )
}

export const BuzzerRenderer = memo(BuzzerRendererInner)
