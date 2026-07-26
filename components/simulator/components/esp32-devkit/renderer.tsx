"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { ESP32_DEVKIT_BOARD_ART } from "@/lib/simulator/assets/esp32-devkit-board-art"
import { PIN_LABELS } from "@/lib/simulator/components/esp32-devkit/definition"

const BOARD_WIDTH = 600
const BOARD_HEIGHT = 296

function Esp32DevkitRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const io2On = simulation?.pinStates[
    pins.find((p) => p.name === "IO2")?.id ?? ""
  ]?.state === "HIGH"

  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect
          x="-4"
          y="-4"
          width={BOARD_WIDTH + 8}
          height={BOARD_HEIGHT + 8}
          rx="10"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
      )}

      {/* ===== BOARD ARTWORK =====
          Real reference photo — the module, its antenna, and everything
          else physical is naturally fully contained within the board,
          since this is a photo rather than a hand-drawn illustration. */}
      <image
        x="0"
        y="0"
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        href={ESP32_DEVKIT_BOARD_ART}
        preserveAspectRatio="none"
      />

      {/* ===== IO2 ONBOARD LED OVERLAY =====
          Small synthetic glow layered near the IO2 pin position rather than
          a repaint of anything in the photo — this board's photo doesn't
          have an obviously isolated "user LED" to key off. */}
      {io2On && (
        <circle
          cx={pins.find((p) => p.name === "IO2")?.x ?? 0}
          cy={20}
          r="4"
          fill="#50FA7B"
          opacity="0.9"
        />
      )}

      {/* ===== PIN NUMBER LABELS ===== */}
      {pins.map((pin) => {
        const isTop = pin.y < BOARD_HEIGHT / 2
        return (
          <text
            key={`${pin.id}-label`}
            x={pin.x}
            y={isTop ? pin.y - 6 : pin.y + 12}
            textAnchor="middle"
            fill="#f4d9a0"
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            {PIN_LABELS[pin.name] ?? pin.name}
          </text>
        )
      })}

      {/* ===== INTERACTIVE PIN HIT AREAS ===== */}
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

export const Esp32DevkitRenderer = memo(Esp32DevkitRendererInner)