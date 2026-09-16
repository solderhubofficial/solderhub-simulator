"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function BatteryRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const voltage = typeof component.metadata.voltage === "number" ? component.metadata.voltage : 5

  return (
    <g data-component-id={component.id}>
      {/* Cell body — cylindrical shading via the shared gradient, capped
          with a brass positive terminal and a flat negative base, like a
          real AA/9V pack rather than a flat grey block. */}
      <rect
        x={10}
        y={12}
        width={20}
        height={50}
        rx={4}
        fill="url(#sim-cylinder-metal)"
        stroke={selected ? "var(--primary)" : "#575757"}
        strokeWidth={selected ? 2 : 1}
        filter="url(#sim-drop-shadow-sm)"
      />
      {/* Paper wrapper band */}
      <rect x={11} y={20} width={18} height={30} fill="#2a2a2a" rx={1.5} />
      <rect x={11} y={20} width={18} height={30} fill="url(#sim-cylinder-metal)" opacity={0.15} rx={1.5} />
      {/* Specular highlight streak */}
      <rect x={13} y={14} width={2.5} height={46} fill="#ffffff" opacity={0.4} rx={1} />
      {/* Positive terminal (brass button, top) */}
      <line x1={20} y1={6} x2={20} y2={12} stroke="#c9a34a" strokeWidth={4} />
      <circle cx={20} cy={6} r={2.4} fill="#e0bb5f" stroke="#8a6a20" strokeWidth={0.6} />
      {/* Negative terminal (flat base, bottom) */}
      <line x1={20} y1={62} x2={20} y2={68} stroke="#333" strokeWidth={6} />
      <text x={20} y={5} textAnchor="middle" fontSize="7" fill="#e0bb5f" fontWeight={700}>+</text>
      <text x={20} y={78} textAnchor="middle" fontSize="7" fill="#9a9a9a" fontWeight={700}>−</text>
      <text x={20} y={38} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#f0f0f0" fontWeight="600">
        {voltage}V
      </text>

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

export const BatteryRenderer = memo(BatteryRendererInner)
