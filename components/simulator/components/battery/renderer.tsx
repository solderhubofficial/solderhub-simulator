"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// Single cylindrical cell. Pins (see definition): positive (20,4),
// negative (20,76). Raised nickel button on top, flat contact on the base,
// copper cap band and a dark printed wrapper showing the cell voltage.
function BatteryRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const voltage = typeof component.metadata.voltage === "number" ? component.metadata.voltage : 5
  const edge = selected ? "var(--primary)" : "#15171a"

  return (
    <g data-component-id={component.id}>
      {/* Positive button */}
      <rect x={15.5} y={4} width={9} height={9} rx={2} fill="url(#sim-steel)" stroke="#6a6f76" strokeWidth={0.7} />
      <rect x={17} y={5.2} width={3} height={6.5} rx={1.4} fill="#ffffff" opacity={0.55} />

      {/* Negative contact */}
      <rect x={13} y={70} width={14} height={6} rx={2} fill="url(#sim-steel)" stroke="#6a6f76" strokeWidth={0.7} />
      <rect x={14.5} y={71.2} width={4} height={3.4} rx={1.2} fill="#ffffff" opacity={0.45} />

      <g filter="url(#sim-drop-shadow-sm)">
        {/* Cell can */}
        <rect x={9} y={12} width={22} height={59} rx={3.2} fill="#1b1f27" stroke={edge} strokeWidth={selected ? 2 : 1} />
      </g>
      {/* Copper cap band + silver base band */}
      <path d="M 9 20 V 15.2 Q 9 12 12.2 12 H 27.8 Q 31 12 31 15.2 V 20 Z" fill="url(#sim-copper)" />
      <path d="M 9 65 H 31 V 67.8 Q 31 71 27.8 71 H 12.2 Q 9 71 9 67.8 Z" fill="url(#sim-steel)" />
      <line x1={9} y1={20.2} x2={31} y2={20.2} stroke="#000000" strokeWidth={0.6} opacity={0.5} />
      <line x1={9} y1={65} x2={31} y2={65} stroke="#000000" strokeWidth={0.6} opacity={0.5} />

      {/* Wrapper print */}
      <rect x={9} y={21} width={22} height={43.5} fill="#1b1f27" />
      <rect x={9} y={21} width={22} height={1.2} fill="#d89a4a" opacity={0.8} />
      <rect x={9} y={63.3} width={22} height={1.2} fill="#d89a4a" opacity={0.8} />
      <text x={20} y={30.4} textAnchor="middle" fill="#e0b64a" fontSize={8} fontWeight={800}>+</text>
      <text x={20} y={46} textAnchor="middle" dominantBaseline="middle" fill="#f4f6f9" fontSize={10} fontWeight={800}>
        {voltage}V
      </text>
      <text x={20} y={59} textAnchor="middle" fill="#9aa3b2" fontSize={8} fontWeight={800}>−</text>

      {/* Cylinder shading over the whole can, plus a long specular streak */}
      <rect x={9} y={12} width={22} height={59} rx={3.2} fill="url(#sim-cyl-shade-v)" />
      <rect x={12.4} y={16} width={2.2} height={50} rx={1.1} fill="#ffffff" opacity={0.3} />

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
