"use client"

import { memo, useMemo } from "react"
import type { ComponentPin, ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// The board is drawn from the pin coordinates themselves (see
// lib/simulator/components/breadboard/definition.ts), so the artwork can
// never drift out of sync with where wires actually land. Previously the
// renderer hard-coded a 500x260 board and skipped the power-rail holes.
const BOARD_W = 470
const BOARD_H = 310
const HOLE = 5.4

const RAIL_STRIP_H = 28
const COL_LABELS = new Set([0, 4, 9, 14, 19, 24, 29])

const TOP_ROW_LETTERS = ["j", "i", "h", "g", "f"]
const BOTTOM_ROW_LETTERS = ["e", "d", "c", "b", "a"]

function holePath(pins: ComponentPin[], dy = 0): string {
  const half = HOLE / 2
  return pins
    .map((p) => `M ${p.x - half} ${p.y - half + dy} h ${HOLE} v ${HOLE} h ${-HOLE} Z`)
    .join(" ")
}

function BreadboardRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const layout = useMemo(() => {
    const topRows = pins.filter((p) => p.name.startsWith("T"))
    const bottomRows = pins.filter((p) => p.name.startsWith("B"))
    const rails = pins.filter((p) => p.name.startsWith("R"))
    const rowYs = (group: ComponentPin[]) => [...new Set(group.map((p) => p.y))].sort((a, b) => a - b)
    const topYs = rowYs(topRows)
    const bottomYs = rowYs(bottomRows)
    const xs = [...new Set(pins.map((p) => p.x))].sort((a, b) => a - b)
    const railYs = {
      topPlus: pins.find((p) => p.name === "R+_0")?.y ?? 10,
      topMinus: pins.find((p) => p.name === "R-_0")?.y ?? 24,
      botPlus: pins.find((p) => p.name === "RB+_0")?.y ?? 270,
      botMinus: pins.find((p) => p.name === "RB-_0")?.y ?? 284,
    }
    return {
      topYs,
      bottomYs,
      xs,
      railYs,
      holes: holePath(pins),
      holesLit: holePath(pins, 0.9),
      railCount: rails.length,
    }
  }, [pins])

  const { topYs, bottomYs, xs, railYs } = layout
  const leftX = xs[0] ?? 30
  const rightX = xs[xs.length - 1] ?? 436
  const trenchTop = (topYs[topYs.length - 1] ?? 96) + 14
  const trenchBottom = (bottomYs[0] ?? 180) - 14
  const edge = selected ? "var(--primary)" : "#c9c2b0"

  return (
    <g data-component-id={component.id}>
      {/* Plastic body */}
      <rect
        x={0}
        y={0}
        width={BOARD_W}
        height={BOARD_H}
        rx={7}
        fill="url(#sim-bb-body)"
        stroke={edge}
        strokeWidth={selected ? 2.5 : 1.4}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={2} y={2} width={BOARD_W - 4} height={BOARD_H - 4} rx={5.5} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.7} />

      {/* Power-rail strips with their red (+) / blue (−) guide lines */}
      {[
        { top: railYs.topPlus - 7, red: railYs.topPlus - 5, blue: railYs.topMinus + 5 },
        { top: railYs.botPlus - 8, red: railYs.botPlus - 5, blue: railYs.botMinus + 5 },
      ].map((s) => (
        <g key={s.top}>
          <rect x={leftX - 13} y={s.top} width={rightX - leftX + 26} height={RAIL_STRIP_H} rx={3} fill="#000000" opacity={0.035} />
          <rect x={leftX - 13} y={s.top} width={rightX - leftX + 26} height={RAIL_STRIP_H} rx={3} fill="none" stroke="#d3cdbb" strokeWidth={0.8} />
          <line x1={leftX - 9} y1={s.red} x2={rightX + 9} y2={s.red} stroke="#e5483c" strokeWidth={1.2} strokeLinecap="round" opacity={0.9} />
          <line x1={leftX - 9} y1={s.blue} x2={rightX + 9} y2={s.blue} stroke="#2f7fe0" strokeWidth={1.2} strokeLinecap="round" opacity={0.9} />
        </g>
      ))}
      {/* Rail polarity marks at both ends */}
      {[
        { y: railYs.topPlus, t: "+", c: "#e5483c" },
        { y: railYs.topMinus, t: "−", c: "#2f7fe0" },
        { y: railYs.botPlus, t: "+", c: "#e5483c" },
        { y: railYs.botMinus, t: "−", c: "#2f7fe0" },
      ].flatMap((m) =>
        [leftX - 16, rightX + 16].map((x) => (
          <text key={`${m.y}-${x}`} x={x} y={m.y + 2.4} textAnchor="middle" fill={m.c} fontSize={7.5} fontWeight={800}>
            {m.t}
          </text>
        ))
      )}

      {/* Centre trench */}
      <rect x={6} y={trenchTop} width={BOARD_W - 12} height={trenchBottom - trenchTop} rx={2} fill="url(#sim-bb-trench)" stroke="#bdb6a4" strokeWidth={0.8} />
      <line x1={8} y1={(trenchTop + trenchBottom) / 2} x2={BOARD_W - 8} y2={(trenchTop + trenchBottom) / 2} stroke="#a79f8c" strokeWidth={0.8} opacity={0.6} />
      {Array.from({ length: 31 }, (_, i) => (
        <rect key={i} x={leftX - 7 + i * 14} y={trenchTop + 2} width={1.2} height={trenchBottom - trenchTop - 4} fill="#9d9684" opacity={0.18} />
      ))}

      {/* Row letters (both sides) */}
      <g fill="#9a937f" fontSize={6.5} fontWeight={700} textAnchor="middle">
        {topYs.map((y, i) => (
          <g key={`t${y}`}>
            <text x={leftX - 16} y={y + 2.3}>{TOP_ROW_LETTERS[i]}</text>
            <text x={rightX + 16} y={y + 2.3}>{TOP_ROW_LETTERS[i]}</text>
          </g>
        ))}
        {bottomYs.map((y, i) => (
          <g key={`b${y}`}>
            <text x={leftX - 16} y={y + 2.3}>{BOTTOM_ROW_LETTERS[i]}</text>
            <text x={rightX + 16} y={y + 2.3}>{BOTTOM_ROW_LETTERS[i]}</text>
          </g>
        ))}
      </g>
      {/* Column numbers on both edges of the trench */}
      <g fill="#9a937f" fontSize={6} fontWeight={700} textAnchor="middle">
        {xs.map((x, i) =>
          COL_LABELS.has(i) ? (
            <g key={x}>
              <text x={x} y={trenchTop - 3.5}>{i + 1}</text>
              <text x={x} y={trenchBottom + 8.5}>{i + 1}</text>
            </g>
          ) : null
        )}
      </g>

      {/* Every hole: a lit lower lip, then the dark square on top */}
      <path d={layout.holesLit} fill="#ffffff" opacity={0.85} />
      <path d={layout.holes} fill="#3b372d" />

      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(e) => onPinPointerDown(pin.id, e)}
          radius={5}
        />
      ))}
    </g>
  )
}

export const BreadboardRenderer = memo(BreadboardRendererInner)
