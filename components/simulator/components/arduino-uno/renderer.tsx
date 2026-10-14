"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { VelxioBoardArt } from "@/components/simulator/components/base/velxio-board-art"
import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

// Artwork and pin positions are Velxio's / Wokwi's Arduino Uno. The indicator
// LED centres below are the same ones Wokwi's <wokwi-arduino-uno> draws
// (SVG units are mm, viewBox starts at x = -4).
const layout = getVelxioBoardLayout("arduino-uno")!
const MM = 96 / 25.4
const led = (mmX: number, mmY: number) => layout.toBoard((mmX + 4) * MM, mmY * MM)
const LED_L = led(26.87 + 1.3, 11.69 + 0.55)
const LED_TX = led(26.9 + 0.975, 16.2 + 0.55)
const LED_RX = led(26.9 + 0.975, 18.5 + 0.55)
const LED_R = 1.3 * MM * layout.scale

function ArduinoUnoRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const driven = (name: string) => {
    const state = simulation?.pinStates[pins.find((p) => p.name === name)?.id ?? ""]?.state
    return state === "HIGH" || state === "PWM"
  }
  const onLed = driven("D13")
  // The simulator has no serial byte stream to flicker against, so TX/RX light
  // while D1/D0 are actively driven.
  const txActive = driven("D1")
  const rxActive = driven("D0")

  return (
    <g data-component-id={component.id}>
      <defs>
        <filter id="unoLedGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {selected && (
        <rect x="-4" y="-4" width={layout.width + 8} height={layout.height + 8} rx="10" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      )}
      <VelxioBoardArt layout={layout} />

      {onLed && <circle cx={LED_L.x} cy={LED_L.y} r={LED_R} fill="#ff8080" filter="url(#unoLedGlow)" />}
      {txActive && <circle cx={LED_TX.x} cy={LED_TX.y} r={LED_R} fill="#ffff00" filter="url(#unoLedGlow)" />}
      {rxActive && <circle cx={LED_RX.x} cy={LED_RX.y} r={LED_R} fill="#ffff00" filter="url(#unoLedGlow)" />}

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

export const ArduinoUnoRenderer = memo(ArduinoUnoRendererInner)
