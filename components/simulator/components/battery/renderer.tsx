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
      <rect x={10} y={12} width={20} height={50} rx={4} fill="#f4f4f4" stroke={selected ? "var(--primary)" : "#575757"} strokeWidth={selected ? 2 : 1} />
      <rect x={14} y={18} width={12} height={30} fill="#ddd" rx={2} />
      <line x1={20} y1={6} x2={20} y2={12} stroke="#333" strokeWidth={3} />
      <line x1={20} y1={62} x2={20} y2={68} stroke="#333" strokeWidth={6} />
      <text x={20} y={40} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#333" fontWeight="600">
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
