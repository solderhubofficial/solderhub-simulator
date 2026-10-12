"use client"

import { memo } from "react"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import type { ComponentRendererProps } from "@/types/simulator"

const ART_WIDTH = 330
const ART_HEIGHT = 220

function RaspberryPi5RendererInner({
  component, pins, selected, onPinClick, onPinPointerDown,
}: ComponentRendererProps) {
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x={-3} y={-3} width={ART_WIDTH + 6} height={ART_HEIGHT + 6}
          rx={4} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href="/third-party/velxio/raspberry-pi-5-board.png" x={0} y={0}
        width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(event) => onPinPointerDown(pin.id, event)}
          radius={3.1} />
      ))}
    </g>
  )
}

export const RaspberryPi5Renderer = memo(RaspberryPi5RendererInner)
