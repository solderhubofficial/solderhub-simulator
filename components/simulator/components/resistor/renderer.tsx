"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const BAND_COLORS: Record<string, string> = {
  black: "#1a1a1a",
  brown: "#7a4a2a",
  red: "#d43b3b",
  orange: "#e07b1f",
  yellow: "#e8c020",
  green: "#3ecf5e",
  blue: "#3e8ecf",
  violet: "#8a4ecf",
  gray: "#888888",
  white: "#f0f0f0",
}

/** Resolve first 2 significant-digit bands + multiplier band from a resistance value. */
function bandsFor(resistance: number): [string, string, string] {
  const digitColors = ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "gray", "white"]
  const str = resistance.toString().replace(/^0+/, "") || "0"
  let sig: string
  let zeros: number
  if (str.length <= 2) {
    sig = str.padStart(2, "0")
    zeros = 0
  } else {
    sig = str.slice(0, 2)
    zeros = str.length - 2
  }
  const d1 = digitColors[Number(sig[0])] ?? "brown"
  const d2 = digitColors[Number(sig[1])] ?? "black"
  const mult = digitColors[Math.min(zeros, 9)] ?? "red"
  return [d1, d2, mult]
}

function ResistorRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const resistance = typeof component.metadata.resistance === "number" ? component.metadata.resistance : 220
  const [b1, b2, b3] = bandsFor(resistance)

  return (
    <g data-component-id={component.id}>
      {/* Leads */}
      <line x1={0} y1={15} x2={14} y2={15} stroke="#9a9a9a" strokeWidth={2} />
      <line x1={66} y1={15} x2={80} y2={15} stroke="#9a9a9a" strokeWidth={2} />

      {/* Body — rounded-cap cylinder look via layered ellipses + rect */}
      <rect
        x={14}
        y={6}
        width={52}
        height={18}
        fill="#e0c090"
        stroke={selected ? "var(--primary)" : "#a87f4a"}
        strokeWidth={selected ? 2 : 1}
      />
      <ellipse cx={14} cy={15} rx={4} ry={9} fill="#e0c090" stroke="#a87f4a" strokeWidth={1} />
      <ellipse cx={66} cy={15} rx={4} ry={9} fill="#e0c090" stroke="#a87f4a" strokeWidth={1} />
      {/* Highlight sheen */}
      <rect x={16} y={8} width={48} height={4} fill="#ffffff" opacity={0.35} rx={2} />

      {/* Color bands */}
      <rect x={26} y={6} width={5} height={18} fill={BAND_COLORS[b1]} />
      <rect x={35} y={6} width={5} height={18} fill={BAND_COLORS[b2]} />
      <rect x={44} y={6} width={5} height={18} fill={BAND_COLORS[b3]} />
      <rect x={56} y={6} width={5} height={18} fill="#d4a017" />

      <text x={40} y={-2} textAnchor="middle" fill="#8892b0" fontSize={9}>
        {resistance}Ω
      </text>

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

export const ResistorRenderer = memo(ResistorRendererInner)
