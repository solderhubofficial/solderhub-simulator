"use client"

import { memo, useId } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"
import {
  LCD_CELL_H,
  LCD_CELL_W,
  LCD_DOT_H,
  LCD_DOT_PITCH_Y,
  LCD_DOT_Y0,
} from "@/components/simulator/canvas/component-defs"

const W = 280
const H = 132
const COLS = 16
const ROWS = 2

// Glass window and the character area centred inside it.
const GLASS_X = 16
const GLASS_Y = 18
const GLASS_W = 248
const GLASS_H = 76
const CHARS_W = COLS * LCD_CELL_W
const CHARS_H = ROWS * LCD_CELL_H
const CHARS_X = GLASS_X + (GLASS_W - CHARS_W) / 2
const CHARS_Y = GLASS_Y + (GLASS_H - CHARS_H) / 2

// A monospace glyph is squeezed horizontally so it spans the 5 dot columns of
// a character cell, and its baseline sits on the 7th dot row.
const GLYPH_FONT_SIZE = 28
const GLYPH_SCALE_X = 0.71
const GLYPH_BASELINE = LCD_DOT_Y0 + 6 * LCD_DOT_PITCH_Y + LCD_DOT_H

function padLine(text: string): string {
  return (text ?? "").slice(0, COLS).padEnd(COLS, " ")
}

// Parallel 16x2 character LCD. Pins (see definition): GND (218,130), VCC (238,130),
// SDA (258,130), SCL (276,130). The screen is a true dot-matrix: every cell
// holds a 5x8 grid of unlit pixels, and the text is revealed on top as lit
// pixels (via a glyph mask), so it reads like the real display.
function Lcd1602ParallelRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const maskId = `sim-lcd-text-${uid}`
  const backlightMetaOn = component.metadata.backlight !== false
  const backlightOn = simulation ? simulation.flags.backlightOn === true : backlightMetaOn
  const lines = [
    padLine(typeof component.metadata.line1 === "string" ? component.metadata.line1 : ""),
    padLine(typeof component.metadata.line2 === "string" ? component.metadata.line2 : ""),
  ]
  const edge = selected ? "var(--primary)" : "#083a22"

  return (
    <g data-component-id={component.id}>
      {/* PCB */}
      <rect
        x={0}
        y={0}
        width={W}
        height={128}
        rx={5}
        fill="url(#sim-pcb-green)"
        stroke={edge}
        strokeWidth={selected ? 2.5 : 1.3}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={1.6} y={1.6} width={W - 3.2} height={124.8} rx={3.8} fill="none" stroke="#ffffff" strokeWidth={0.5} opacity={0.18} />
      {[[7, 7], [W - 7, 7], [7, 121]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={3.4} fill="#d8b24c" />
          <circle cx={cx} cy={cy} r={2.1} fill="#05241a" />
        </g>
      ))}

      {/* 16-pad LCD header along the top edge */}
      {Array.from({ length: 16 }, (_, i) => (
        <g key={i}>
          <circle cx={74 + i * 8.9} cy={5.6} r={1.9} fill="#d8b24c" />
          <circle cx={74 + i * 8.9} cy={5.6} r={0.9} fill="#05241a" />
        </g>
      ))}
      <g fill="#dff5e7" fontSize={4} fontWeight={700} textAnchor="middle">
        <text x={74} y={11.6}>1</text>
        <text x={74 + 15 * 8.9} y={11.6}>16</text>
      </g>

      {/* Stainless bezel */}
      <rect x={10} y={12} width={260} height={88} rx={3} fill="url(#sim-steel)" stroke="#5b6066" strokeWidth={0.8} filter="url(#sim-drop-shadow-sm)" />
      <rect x={11.4} y={13.2} width={257.2} height={1.2} rx={0.6} fill="#ffffff" opacity={0.6} />
      {[[13.4, 15.4], [266.6, 15.4], [13.4, 96.6], [266.6, 96.6]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={1.5} fill="#2d3238" />
          <circle cx={cx - 0.25} cy={cy - 0.25} r={0.55} fill="#9aa1a9" />
        </g>
      ))}

      {/* Glass */}
      <rect x={GLASS_X - 2} y={GLASS_Y - 2} width={GLASS_W + 4} height={GLASS_H + 4} rx={2} fill="#05070a" />
      <rect
        x={GLASS_X}
        y={GLASS_Y}
        width={GLASS_W}
        height={GLASS_H}
        fill={backlightOn ? "url(#sim-lcd-on)" : "#0f1522"}
        style={{ transition: "fill 150ms ease" }}
      />
      {backlightOn && <rect x={GLASS_X} y={GLASS_Y} width={GLASS_W} height={GLASS_H} fill="url(#sim-lcd-bloom)" />}
      <rect
        x={GLASS_X + 1.5}
        y={GLASS_Y + 1.5}
        width={GLASS_W - 3}
        height={GLASS_H - 3}
        fill="none"
        stroke="#000000"
        strokeWidth={3}
        opacity={backlightOn ? 0.16 : 0.3}
      />

      {/* Dot-matrix: unlit pixels everywhere, lit pixels revealed through the text */}
      <g transform={`translate(${CHARS_X} ${CHARS_Y})`}>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={CHARS_W} height={CHARS_H}>
          <rect width={CHARS_W} height={CHARS_H} fill="#000000" />
          <g
            fill="#ffffff"
            fontFamily="ui-monospace, 'DejaVu Sans Mono', 'Courier New', monospace"
            fontWeight={700}
            fontSize={GLYPH_FONT_SIZE}
            textAnchor="middle"
            transform={`scale(${GLYPH_SCALE_X} 1)`}
          >
            {lines.map((line, row) =>
              Array.from(line).map((ch, col) =>
                ch === " " ? null : (
                  <text key={`${row}-${col}`} x={((col + 0.5) * LCD_CELL_W) / GLYPH_SCALE_X} y={row * LCD_CELL_H + GLYPH_BASELINE}>
                    {ch}
                  </text>
                )
              )
            )}
          </g>
        </mask>
        <rect width={CHARS_W} height={CHARS_H} fill="url(#sim-lcd-dots-off)" opacity={backlightOn ? 1 : 0.35} />
        <rect
          width={CHARS_W}
          height={CHARS_H}
          fill="url(#sim-lcd-dots-on)"
          mask={`url(#${maskId})`}
          opacity={backlightOn ? 1 : 0.16}
          style={{ transition: "opacity 150ms ease" }}
        />
      </g>

      {/* Glass glare */}
      <rect x={GLASS_X} y={GLASS_Y} width={GLASS_W} height={GLASS_H} fill="url(#sim-lcd-glare)" pointerEvents="none" />

      {/* Silkscreen */}
      <text x={14} y={114} fill="#dff5e7" fontSize={7} fontWeight={700} letterSpacing={0.5}>
        16×2 LCD · PARALLEL
      </text>

      {/* I2C header: housing, gold pins and silk labels */}
      <rect x={198} y={119} width={84} height={8} rx={1.2} fill="url(#sim-plastic-dark)" />
      {pins.map((pin) => (
        <g key={`${pin.id}-hdr`}>
          <LeadV x={pin.x} y1={121} y2={pin.y} w={2.4} kind="gold" />
          <text x={pin.x} y={116.6} textAnchor="middle" fill="#dff5e7" fontSize={5.4} fontWeight={700}>
            {pin.name}
          </text>
        </g>
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

export const Lcd1602ParallelRenderer = memo(Lcd1602ParallelRendererInner)
