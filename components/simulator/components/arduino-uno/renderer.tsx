"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { ARDUINO_UNO_BOARD_ART } from "@/lib/simulator/assets/arduino-uno-board-art"

// Source artwork's native viewBox is 194 x 138.3 — scaled up ~2.32x here so
// it sits comfortably in the same footprint the rest of the simulator's
// components expect (roughly matches the old 450x350 canvas).
const ART_VB_W = 194
const ART_VB_H = 138.3
const SCALE = 2.32
const W = ART_VB_W * SCALE // ~450
const H = ART_VB_H * SCALE // ~321

function ArduinoUnoRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const onLed = simulation?.pinStates[
    pins.find((p) => p.name === "D13")?.id ?? ""
  ]?.state === "HIGH"

  // Pin positions below are placed by eye against the reference artwork's
  // own header regions (it has no text labels to key off, so this is a
  // best-visual-match rather than a pixel-measured one). If a hit target
  // looks off once rendered, nudge the numbers here — nothing else depends
  // on these beyond where the invisible click targets sit.
  function getPinPosition(name: string): { x: number; y: number } | null {
    // Digital header — runs along the artwork's top edge, left-to-right.
    const digitalNames = ["GND", "D13", "D12", "D11", "D10", "D9", "D8"]
    const digIndex = digitalNames.indexOf(name)
    if (digIndex !== -1) {
      const startX = 40
      const endX = 260
      const step = (endX - startX) / (digitalNames.length - 1)
      return { x: startX + digIndex * step, y: 16 }
    }

    // Power header — left column of the bottom-right header cluster.
    const powerNames = ["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "VIN"]
    const powIndex = powerNames.indexOf(name)
    if (powIndex !== -1) {
      const startY = 258
      const endY = 312
      const step = (endY - startY) / (powerNames.length - 1)
      return { x: 358, y: startY + powIndex * step }
    }

    // Analog header — right column of the same bottom-right cluster.
    const analogNames = ["A0", "A1", "A2", "A3", "A4", "A5"]
    const anaIndex = analogNames.indexOf(name)
    if (anaIndex !== -1) {
      const startY = 262
      const endY = 306
      const step = (endY - startY) / (analogNames.length - 1)
      return { x: 402, y: startY + anaIndex * step }
    }

    return null
  }

  return (
    <g data-component-id={component.id}>
      <defs>
        <radialGradient id="unoLedGreenOn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8affaa" />
          <stop offset="60%" stopColor="#33cc55" />
          <stop offset="100%" stopColor="#1a7a33" />
        </radialGradient>
        <filter id="unoLedGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ===== BOARD ARTWORK ===== */}
      {selected && (
        <rect
          x="-4"
          y="-4"
          width={W + 8}
          height={H + 8}
          rx="10"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
      )}
      <svg
        x="0"
        y="0"
        width={W}
        height={H}
        viewBox={`0 0 ${ART_VB_W} ${ART_VB_H}`}
        // Static, trusted, build-time asset (see arduino-uno-board-art.ts) —
        // not user input.
        dangerouslySetInnerHTML={{ __html: ARDUINO_UNO_BOARD_ART }}
      />

      {/* ===== D13 "L" LED OVERLAY =====
          The reference art doesn't expose a distinct, isolated LED shape we
          can key off reliably, so this is a synthetic glow dot layered on
          top at a plausible onboard-LED position rather than a repaint of
          something already in the artwork. */}
      <circle
        cx="272"
        cy="196"
        r="5"
        fill={onLed ? "url(#unoLedGreenOn)" : "#12331d"}
        filter={onLed ? "url(#unoLedGlow)" : undefined}
        opacity={onLed ? 1 : 0.6}
      />

      {/* ===== INTERACTIVE PIN HIT AREAS ===== */}
      {pins.map((pin) => {
        const pos = getPinPosition(pin.name)
        const updatedPin = pos ? { ...pin, x: pos.x, y: pos.y } : pin
        return (
          <PinHitArea
            key={pin.id}
            pin={updatedPin}
            componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(e) => onPinPointerDown(pin.id, e)}
          />
        )
      })}
    </g>
  )
}

export const ArduinoUnoRenderer = memo(ArduinoUnoRendererInner)