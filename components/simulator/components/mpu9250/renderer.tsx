"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// GY-521-style breakout artwork from Wokwi's MIT-licensed @wokwi/elements (see THIRD_PARTY_NOTICES.md).
// The MPU-9250 breakout is the same board footprint, so it shares the artwork.
const ART_WIDTH = 170
const ART_HEIGHT = 127.5

function Mpu9250RendererInner({ component, pins, selected, simulation, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const tiltX = typeof simulation?.flags.tiltX === "number" ? simulation.flags.tiltX : 0
  const tiltY = typeof simulation?.flags.tiltY === "number" ? simulation.flags.tiltY : 0
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x={-3} y={-3} width={ART_WIDTH + 6} height={ART_HEIGHT + 6} rx={4} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href="/third-party/wokwi/mpu6050.svg" x={0} y={0} width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
      <text x={ART_WIDTH / 2} y={ART_HEIGHT + 11} textAnchor="middle" fill="currentColor" opacity={0.6} fontSize={7} fontWeight={700}>MPU-9250 · X {tiltX}° Y {tiltY}°</text>
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(event) => onPinPointerDown(pin.id, event)} radius={3.2} />
      ))}
    </g>
  )
}

export const Mpu9250Renderer = memo(Mpu9250RendererInner)
