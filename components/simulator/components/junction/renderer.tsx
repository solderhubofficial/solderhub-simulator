"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { JUNCTION_SIZE } from "@/lib/simulator/utils/wire-junction"

function JunctionRendererInner({ component, pins, selected, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const c = JUNCTION_SIZE / 2
  return (
    <g data-component-id={component.id}>
      <circle cx={c} cy={c} r={4.6} fill="#2b2f33" opacity={0.35} transform="translate(0.6 1.2)" />
      <circle cx={c} cy={c} r={4.4} fill="url(#sim-steel)" stroke={selected ? "var(--primary)" : "#5f656c"} strokeWidth={selected ? 1.6 : 0.9} />
      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          radius={4.4}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(e) => onPinPointerDown(pin.id, e)}
        />
      ))}
    </g>
  )
}

export const JunctionRenderer = memo(JunctionRendererInner)
