"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function PushButtonRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const pressed = simulation?.flags.pressed === true || component.metadata.pressed === true

  return (
    <g data-component-id={component.id}>
      {/* Legs — left and right, through-hole style */}
      <line x1={2} y1={25} x2={12} y2={25} stroke="#9a9a9a" strokeWidth={2.5} />
      <line x1={44} y1={25} x2={54} y2={25} stroke="#9a9a9a" strokeWidth={2.5} />

      {/* Body */}
      <rect
        x={12}
        y={7}
        width={32}
        height={36}
        rx={2}
        fill="url(#sim-metal)"
        stroke={selected ? "var(--primary)" : "#5c6469"}
        strokeWidth={selected ? 2 : 1}
        filter="url(#sim-drop-shadow-sm)"
      />
      {/* Corner mounting dots */}
      {[[16, 11], [40, 11], [16, 39], [40, 39]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill="#3a3f43" />
      ))}
      {/* Cap */}
      <circle
        cx={28}
        cy={25}
        r={9}
        fill={pressed ? "#2fae4e" : "#3ecf5e"}
        stroke="#1f8f3c"
        strokeWidth={1}
        opacity={pressed ? 0.85 : 1}
      />
      <ellipse cx={25} cy={22} rx={3} ry={2} fill="#ffffff" opacity={0.35} />

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

export const PushButtonRenderer = memo(PushButtonRendererInner)
