"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// Velxio's native SVG uses viewBox="-4 0 72.58 53.34". Keep the image and
// clickable connector anchors in the same coordinate transform so wires land
// on the actual female-header holes rather than on approximate label positions.
const SVG_SCALE = 6.34
const SVG_X = 4
const W = 460
const H = 338.2
const sx = (x: number) => (x + SVG_X) * SVG_SCALE
const sy = (y: number) => y * SVG_SCALE

const DIGITAL_LEFT = ["AREF", "GND", "D13", "D12", "D11", "D10", "D9", "D8", "D7", "D6"]
const DIGITAL_RIGHT = ["D5", "D4", "D3", "D2", "D1", "D0"]
const POWER = ["IOREF", "RESET", "3.3V", "5V", "GND1", "GND2", "VIN"]
const ANALOG = ["A0", "A1", "A2", "A3", "A4", "A5"]

function getPinPosition(name: string): { x: number; y: number } | null {
  const leftIndex = DIGITAL_LEFT.indexOf(name)
  if (leftIndex >= 0) return { x: sx(17.497 + 1.27 + leftIndex * 2.54), y: sy(2.54) }

  const rightIndex = DIGITAL_RIGHT.indexOf(name)
  if (rightIndex >= 0) return { x: sx(44.421 + 1.27 + rightIndex * 2.54), y: sy(2.54) }

  const powerIndex = POWER.indexOf(name)
  if (powerIndex >= 0) return { x: sx(26.641 + 1.27 + powerIndex * 2.54), y: sy(50.8) }

  const analogIndex = ANALOG.indexOf(name)
  if (analogIndex >= 0) return { x: sx(49.501 + 1.27 + analogIndex * 2.54), y: sy(50.8) }

  return null
}

function ArduinoUnoRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect
          x={-3}
          y={-3}
          width={W + 6}
          height={H + 6}
          rx={8}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
      )}

      {/* Authentic Velxio board illustration, including the real connector holes
          and silkscreen labels. Attribution/license are documented in
          THIRD_PARTY_NOTICES.md. */}
      <image
        href="/third-party/velxio/arduino-uno.svg"
        x={0}
        y={0}
        width={W}
        height={H}
        preserveAspectRatio="none"
      />

      {pins.map((pin) => {
        const pos = getPinPosition(pin.name)
        if (!pos) return null
        const updatedPin = { ...pin, x: pos.x, y: pos.y }
        return (
          <PinHitArea
            key={pin.id}
            pin={updatedPin}
            componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(event) => onPinPointerDown(pin.id, event)}
          />
        )
      })}
    </g>
  )
}

export const ArduinoUnoRenderer = memo(ArduinoUnoRendererInner)
