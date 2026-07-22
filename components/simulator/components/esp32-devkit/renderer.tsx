"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const BOARD_WIDTH = 220
const BOARD_HEIGHT = 480

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
      {/* Board body */}
      <rect
        x={0}
        y={0}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx={10}
        fill="url(#sim-pcb-dark)"
        stroke={selected ? "var(--primary)" : "#44475A"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      {/* USB port */}
      <rect x={BOARD_WIDTH / 2 - 16} y={-8} width={32} height={20} rx={2} fill="url(#sim-metal)" stroke="#6272A4" />
      {/* Label */}
      <text x={BOARD_WIDTH / 2} y={38} textAnchor="middle" fill="#F8F8F2" fontSize={14} fontWeight="bold">
        ESP32
      </text>
      <text x={BOARD_WIDTH / 2} y={54} textAnchor="middle" fill="#6272A4" fontSize={9}>
        DEVKIT 38-pin
      </text>
      {/* RF shield / MCU can */}
      <rect
        x={BOARD_WIDTH / 2 - 45}
        y={200}
        width={90}
        height={70}
        rx={4}
        fill="#1A1C23"
        stroke="#6272A4"
      />
      <text x={BOARD_WIDTH / 2} y={240} textAnchor="middle" fill="#6272A4" fontSize={9}>
        ESP32-WROOM
      </text>
      {/* Onboard LED on IO2 */}
      <circle cx={BOARD_WIDTH / 2 + 60} cy={70} r={6} fill={io2On ? "#50FA7B" : "#44475A"} stroke="#6272A4" />
      <text x={BOARD_WIDTH / 2 + 60} y={90} textAnchor="middle" fill="#6272A4" fontSize={8}>
        IO2
      </text>
      {/* Pin header strips */}
      <rect x={2} y={40} width={10} height={410} rx={2} fill="#1A1C23" />
      <rect x={BOARD_WIDTH - 12} y={40} width={10} height={410} rx={2} fill="#1A1C23" />
      {/* Pin name labels */}
      {pins.map((pin) => {
        const isLeft = pin.x < BOARD_WIDTH / 2
        return (
          <text
            key={`${pin.id}-label`}
            x={isLeft ? pin.x + 16 : pin.x - 16}
            y={pin.y + 3}
            textAnchor={isLeft ? "start" : "end"}
            fill="#8892B0"
            fontSize={8}
          >
            {pin.name}
          </text>
        )
      })}
      {/* Pin hit areas */}
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
