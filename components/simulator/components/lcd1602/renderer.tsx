"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 280
const H = 132
const COLS = 16
const ROWS = 2

function padLine(text: string): string {
  return (text ?? "").slice(0, COLS).padEnd(COLS, " ")
}

function Lcd1602RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const backlightMetaOn = component.metadata.backlight !== false
  const backlightOn = simulation ? simulation.flags.backlightOn === true : backlightMetaOn
  const line1 = padLine(typeof component.metadata.line1 === "string" ? component.metadata.line1 : "")
  const line2 = padLine(typeof component.metadata.line2 === "string" ? component.metadata.line2 : "")

  const screenX = 20
  const screenY = 16
  const screenW = W - 40
  const screenH = 74
  const cellW = screenW / COLS
  const cellH = screenH / ROWS

  return (
    <g data-component-id={component.id}>
      {/* PCB body */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={6}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      {[[10, 10], [W - 10, 10], [10, H - 26], [W - 10, H - 26]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill="#123c6e" />
      ))}

      {/* Contrast trim pot (top-right corner) */}
      <rect x={W - 34} y={4} width={16} height={10} rx={1.5} fill="url(#sim-metal)" stroke="#6b7178" />
      <circle cx={W - 26} cy={9} r={2.2} fill="#3a3a3a" />

      {/* Bezel */}
      <rect x={screenX - 6} y={screenY - 6} width={screenW + 12} height={screenH + 12} rx={4} fill="#0c0c0c" filter="url(#sim-drop-shadow-sm)" />

      {/* Screen */}
      <rect
        x={screenX}
        y={screenY}
        width={screenW}
        height={screenH}
        fill={backlightOn ? "url(#sim-lcd-backlight)" : "#141a1c"}
        style={{ transition: "fill 150ms ease" }}
      />

      {/* Dot-matrix character cell grid */}
      <g opacity={backlightOn ? 0.16 : 0.25}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => (
            <rect
              key={`cell-${r}-${c}`}
              x={screenX + c * cellW + 1.2}
              y={screenY + r * cellH + 1.2}
              width={cellW - 2.4}
              height={cellH - 2.4}
              rx={1}
              fill="#000000"
            />
          ))
        )}
      </g>

      {/* Character text */}
      <g fill={backlightOn ? "#052030" : "#3a4548"} fontFamily="ui-monospace, 'Courier New', monospace" fontWeight={600}>
        <text
          x={screenX + cellW / 2}
          y={screenY + cellH * 0.68}
          fontSize={cellH * 0.62}
          textLength={screenW - cellW}
          lengthAdjust="spacingAndGlyphs"
        >
          {line1}
        </text>
        <text
          x={screenX + cellW / 2}
          y={screenY + cellH * 1.68}
          fontSize={cellH * 0.62}
          textLength={screenW - cellW}
          lengthAdjust="spacingAndGlyphs"
        >
          {line2}
        </text>
      </g>

      <text x={W / 2} y={H - 12} textAnchor="middle" fill="#cfe3ff" fontSize={8} letterSpacing={0.5}>
        16×2 LCD · I2C
      </text>

      {/* I2C header strip */}
      <rect x={200} y={H - 8} width={92} height={8} rx={1.5} fill="#0d0d0d" />
      {pins.map((pin) => (
        <circle key={`${pin.id}-hole`} cx={pin.x} cy={H - 4} r={1.6} fill="#3a3a3a" stroke="#000" strokeWidth={0.4} />
      ))}
      {pins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={H + 10} textAnchor="middle" fill="#cfe3ff" fontSize={6.5}>
          {pin.name}
        </text>
      ))}

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

export const Lcd1602Renderer = memo(Lcd1602RendererInner)
