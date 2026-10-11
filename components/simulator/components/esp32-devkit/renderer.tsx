"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { ESP32_DEVKIT_BOARD_ART } from "@/lib/simulator/assets/esp32-devkit-board-art"

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

      {/* Source artwork already contains the silkscreen labels. */}
      {/* IO2 status glow follows the physical user-LED position on this art. */}
      {io2On && (
        <circle
          cx={445}
          cy={230}
          r={5}
          fill="#50FA7B"
          opacity="0.92"
          stroke="#D8FFE2"
          strokeWidth={1}
        />
      )}

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