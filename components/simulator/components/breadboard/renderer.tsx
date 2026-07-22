"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function BreadboardRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const width = 500
  const height = 260

  return (
    <g data-component-id={component.id}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={8}
        fill="#F5F5F0"
        stroke={selected ? "var(--primary)" : "#CCC"
        }
        strokeWidth={selected ? 2.5 : 1.5}
      />
      {/* Center gap */}
      <rect x={20} y={108} width={width - 40} height={44} fill="#E8E8E3" rx={2} />
      {/* Power rail markers */}
      <line x1={20} y1={14} x2={width - 20} y2={14} stroke="#E74C3C" strokeWidth={2} />
      <line x1={20} y1={28} x2={width - 20} y2={28} stroke="#3498DB" strokeWidth={2} />
      <line x1={20} y1={height - 28} x2={width - 20} y2={height - 28} stroke="#E74C3C" strokeWidth={2} />
      <line x1={20} y1={height - 14} x2={width - 20} y2={height - 14} stroke="#3498DB" strokeWidth={2} />
      {/* Hole dots (visual only for top/bottom sections) */}
      {pins
        .filter((p) => p.name.startsWith("T") || p.name.startsWith("B"))
        .map((pin) => (
          <circle
            key={`dot-${pin.id}`}
            cx={pin.x}
            cy={pin.y}
            r={3}
            fill="#BBB"
          />
        ))}
      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(e) => onPinPointerDown(pin.id, e)}
          radius={5}
        />
      ))}
    </g>
  )
}

export const BreadboardRenderer = memo(BreadboardRendererInner)
