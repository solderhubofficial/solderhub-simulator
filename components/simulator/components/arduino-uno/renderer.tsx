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

// Real, connectable pin names (from lib/simulator/components/arduino-uno/definition.ts).
const DIGITAL_ORDER = [
  "D13", "D12", "D11", "D10", "D9", "D8",
  "D7", "D6", "D5", "D4", "D3", "D2", "D1", "D0",
]
const POWER_ORDER = ["5V", "3.3V", "GND1", "GND2", "VIN"]
const ANALOG_ORDER = ["A0", "A1", "A2", "A3", "A4", "A5"]

// Silkscreen-style text shown per pin (real Uno naming; "~" = PWM-capable).
const DIGITAL_LABELS: Record<string, string> = {
  D13: "13", D12: "12", D11: "~11", D10: "~10", D9: "~9", D8: "8",
  D7: "7", D6: "~6", D5: "~5", D4: "4", D3: "~3", D2: "2",
  D1: "TX\u25b81", D0: "RX\u25c40",
}
const POWER_LABELS: Record<string, string> = {
  "5V": "5V", "3.3V": "3V3", GND1: "GND", GND2: "GND", VIN: "VIN",
}
const ANALOG_LABELS: Record<string, string> = {
  A0: "A0", A1: "A1", A2: "A2", A3: "A3", A4: "A4", A5: "A5",
}

// Digital header layout: two cosmetic-only slots (AREF, GND) prepended to
// match the real board's silkscreen order, then the 14 real pins — 16
// slots total, matching the header's own visible slot count in the artwork.
const DIGITAL_ROW_START_X = 34
const DIGITAL_ROW_END_X = 266
const DIGITAL_ROW_Y = 16
const DIGITAL_ROW_SLOTS = 2 + DIGITAL_ORDER.length
const digitalSlotX = (i: number) =>
  DIGITAL_ROW_START_X + (i * (DIGITAL_ROW_END_X - DIGITAL_ROW_START_X)) / (DIGITAL_ROW_SLOTS - 1)

// Power header: two cosmetic-only slots (IOREF, RESET) prepended.
// Kept clear of the heatsink + reset-button graphics, which occupy roughly
// x > 385 in this coordinate space (per the live render — the artwork's
// heatsink/reset-button cluster sits at the board's lower-right).
const POWER_COL_START_Y = 250
const POWER_COL_END_Y = 316
const POWER_COL_X = 330
const POWER_COL_SLOTS = 2 + POWER_ORDER.length
const powerSlotY = (i: number) =>
  POWER_COL_START_Y + (i * (POWER_COL_END_Y - POWER_COL_START_Y)) / (POWER_COL_SLOTS - 1)

const ANALOG_COL_START_Y = 262
const ANALOG_COL_END_Y = 306
const ANALOG_COL_X = 366
const analogSlotY = (i: number) =>
  ANALOG_COL_START_Y + (i * (ANALOG_COL_END_Y - ANALOG_COL_START_Y)) / (ANALOG_ORDER.length - 1)

// ATmega328P DIP-28 footprint, read directly off the artwork's own path data
// (x 13-99, y 31-52 in the 194x138.3 source units) — legs on the top and
// bottom edges, 14 per side. Pin-1 orientation follows the standard DIP
// counter-clockwise convention (pin 1 bottom-left -> 14 bottom-right ->
// 15 top-right -> 28 top-left); the artwork has no visible notch marker to
// confirm which end pin 1 is actually on, so this is the conventional
// assumption, not a verified one — flip the two ranges below if it turns
// out backwards once you see it rendered.
const CHIP_X0 = 34
const CHIP_X1 = 218
const CHIP_TOP_Y = 68
const CHIP_BOTTOM_Y = 124
const CHIP_PIN_COUNT = 14

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

  // Pin positions are placed by eye against the reference artwork's own
  // header regions (it has no text labels to key off, so this is a
  // best-visual-match rather than a pixel-measured one). Nudge the numbers
  // above if a hit target looks off once rendered.
  function getPinPosition(name: string): { x: number; y: number } | null {
    const digIndex = DIGITAL_ORDER.indexOf(name)
    if (digIndex !== -1) {
      // +2 slots reserved for the cosmetic AREF/GND labels at the start.
      return { x: digitalSlotX(digIndex + 2), y: DIGITAL_ROW_Y }
    }
    const powIndex = POWER_ORDER.indexOf(name)
    if (powIndex !== -1) {
      return { x: POWER_COL_X, y: powerSlotY(powIndex + 2) }
    }
    const anaIndex = ANALOG_ORDER.indexOf(name)
    if (anaIndex !== -1) {
      return { x: ANALOG_COL_X, y: analogSlotY(anaIndex) }
    }
    return null
  }

  const chipTopPins = Array.from({ length: CHIP_PIN_COUNT }, (_, i) => {
    const x = CHIP_X0 + (i * (CHIP_X1 - CHIP_X0)) / (CHIP_PIN_COUNT - 1)
    const num = 28 - i // 28 (top-left) down to 15 (top-right)
    return { x, y: CHIP_TOP_Y, num }
  })
  const chipBottomPins = Array.from({ length: CHIP_PIN_COUNT }, (_, i) => {
    const x = CHIP_X0 + (i * (CHIP_X1 - CHIP_X0)) / (CHIP_PIN_COUNT - 1)
    const num = i + 1 // 1 (bottom-left) up to 14 (bottom-right)
    return { x, y: CHIP_BOTTOM_Y, num }
  })

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

      {/* ===== D13 "L" LED OVERLAY ===== */}
      <circle
        cx="272"
        cy="196"
        r="5"
        fill={onLed ? "url(#unoLedGreenOn)" : "#12331d"}
        filter={onLed ? "url(#unoLedGlow)" : undefined}
        opacity={onLed ? 1 : 0.6}
      />
      <text x="272" y="186" fontSize="7" textAnchor="middle" fill="#e8f2f0" fontFamily="monospace">
        L
      </text>

      {/* ===== DIGITAL HEADER LABELS (AREF, GND cosmetic + 14 real pins) ===== */}
      <text x={digitalSlotX(0)} y={DIGITAL_ROW_Y - 4} fontSize="6" textAnchor="middle" fill="#e8f2f0" fontFamily="monospace">
        AREF
      </text>
      <text x={digitalSlotX(1)} y={DIGITAL_ROW_Y - 4} fontSize="6" textAnchor="middle" fill="#e8f2f0" fontFamily="monospace">
        GND
      </text>
      {DIGITAL_ORDER.map((name, i) => (
        <text
          key={name}
          x={digitalSlotX(i + 2)}
          y={DIGITAL_ROW_Y - 4}
          fontSize="6"
          textAnchor="middle"
          fill="#e8f2f0"
          fontFamily="monospace"
        >
          {DIGITAL_LABELS[name]}
        </text>
      ))}
      <text x={(DIGITAL_ROW_START_X + DIGITAL_ROW_END_X) / 2} y={DIGITAL_ROW_Y + 24} fontSize="6.5" textAnchor="middle" fill="#e8f2f0" fontFamily="monospace" opacity="0.85">
        DIGITAL (PWM~)
      </text>

      {/* ===== POWER HEADER LABELS (IOREF, RESET cosmetic + 5 real pins) ===== */}
      <text x={POWER_COL_X - 22} y={powerSlotY(0) + 2} fontSize="6" fill="#e8f2f0" fontFamily="monospace">
        IOREF
      </text>
      <text x={POWER_COL_X - 22} y={powerSlotY(1) + 2} fontSize="6" fill="#e8f2f0" fontFamily="monospace">
        RESET
      </text>
      {POWER_ORDER.map((name, i) => (
        <text
          key={name}
          x={POWER_COL_X - 22}
          y={powerSlotY(i + 2) + 2}
          fontSize="6"
          fill="#e8f2f0"
          fontFamily="monospace"
        >
          {POWER_LABELS[name]}
        </text>
      ))}
      <text x={POWER_COL_X - 22} y={POWER_COL_START_Y - 6} fontSize="6.5" fill="#e8f2f0" fontFamily="monospace" opacity="0.85">
        POWER
      </text>

      {/* ===== ANALOG HEADER LABELS ===== */}
      {ANALOG_ORDER.map((name, i) => (
        <text
          key={name}
          x={ANALOG_COL_X - 6}
          y={analogSlotY(i) + 2}
          fontSize="6"
          textAnchor="end"
          fill="#e8f2f0"
          fontFamily="monospace"
        >
          {ANALOG_LABELS[name]}
        </text>
      ))}
      <text x={ANALOG_COL_X - 6} y={ANALOG_COL_START_Y - 6} fontSize="6.5" textAnchor="end" fill="#e8f2f0" fontFamily="monospace" opacity="0.85">
        ANALOG IN
      </text>

      {/* ===== ATMEGA328P DIP-28 PIN NUMBERING (cosmetic only — not wireable
          in this simulator, just labeling the physical chip like a real
          datasheet pinout would). ===== */}
      {chipTopPins.map((p) => (
        <text
          key={`chip-${p.num}`}
          x={p.x}
          y={p.y - 6}
          fontSize="4.5"
          textAnchor="middle"
          fill="#f4d9a0"
          fontFamily="monospace"
        >
          {p.num}
        </text>
      ))}
      {chipBottomPins.map((p) => (
        <text
          key={`chip-${p.num}`}
          x={p.x}
          y={p.y + 9}
          fontSize="4.5"
          textAnchor="middle"
          fill="#f4d9a0"
          fontFamily="monospace"
        >
          {p.num}
        </text>
      ))}

      {/* ===== ARDUINO WORDMARK + INFINITY + UNO BADGE ===== */}
      <g transform="translate(150, 235)" opacity="0.92">
        <text
          x="0"
          y="0"
          fontSize="19"
          fontStyle="italic"
          fontFamily="Georgia, 'Times New Roman', serif"
          fill="#e8f2f0"
        >
          Arduino
        </text>
        {/* Simplified infinity mark */}
        <g transform="translate(30, 22)">
          <circle cx="-6" cy="0" r="6" fill="none" stroke="#e8f2f0" strokeWidth="2.4" />
          <circle cx="6" cy="0" r="6" fill="none" stroke="#e8f2f0" strokeWidth="2.4" />
        </g>
        <text
          x="0"
          y="46"
          fontSize="15"
          letterSpacing="2"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fill="#e8f2f0"
        >
          UNO
        </text>
      </g>

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