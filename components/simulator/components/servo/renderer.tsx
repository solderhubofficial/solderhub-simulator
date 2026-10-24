"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const ART_WIDTH = 170.08
const ART_HEIGHT = 119.55

function ServoRendererInner({
  component, pins, selected, simulation, onPinClick, onPinPointerDown,
}: ComponentRendererProps) {
  const angle = typeof simulation?.flags.angle === "number"
    ? Math.min(180, Math.max(0, simulation.flags.angle))
    : 90
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x={-3} y={-3} width={ART_WIDTH + 6} height={ART_HEIGHT + 6}
          rx={3} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href="/third-party/velxio/sg90.svg" x={0} y={0}
        width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
      <g transform={`rotate(${angle - 90} 91.467 59.773)`} pointerEvents="none">
        <rect x={88.4} y={10} width={6.1} height={51} rx={3}
          fill="#f4f4f4" stroke="#bdbdbd" strokeWidth={1} />
        {[17, 26, 35, 44, 53].map((y) => (
          <circle key={y} cx={91.45} cy={y} r={1.55} fill="#777" stroke="#ddd" strokeWidth={0.5} />
        ))}
      </g>
      <circle cx={91.467} cy={59.773} r={7.2} fill="#ccc" stroke="#888" strokeWidth={0.8} />
      <circle cx={91.467} cy={59.773} r={2.1} fill="#666" />
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(event) => onPinPointerDown(pin.id, event)}
          radius={2.4} />
      ))}
    </g>
  )
}

export const ServoRenderer = memo(ServoRendererInner)
