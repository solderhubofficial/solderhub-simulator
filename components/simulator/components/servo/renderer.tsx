"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const ART_WIDTH = 170.08
const ART_HEIGHT = 119.55

function ServoRendererInner({
  component, pins, selected, onPinClick, onPinPointerDown,
}: ComponentRendererProps) {
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x={-3} y={-3} width={ART_WIDTH + 6} height={ART_HEIGHT + 6}
          rx={3} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href="/third-party/velxio/sg90.svg" x={0} y={0}
        width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
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
