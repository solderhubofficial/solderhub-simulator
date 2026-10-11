"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadH } from "@/components/simulator/components/base/leads"

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

// Axial carbon-film resistor. Pins (see definition): A (0,15), B (80,15).
// Silhouette is the classic "dog bone": fatter end caps, slimmer middle.
function ResistorRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const resistance = typeof component.metadata.resistance === "number" ? component.metadata.resistance : 220
  const [b1, b2, b3] = bandsFor(resistance)
  const edge = selected ? "var(--primary)" : "#9a7640"
  const edgeWidth = selected ? 1.6 : 0.8

  return (
    <g data-component-id={component.id}>
      {/* Leads run into the end caps */}
      <LeadH x1={0} x2={13} y={15} w={2} />
      <LeadH x1={67} x2={80} y={15} w={2} />

      <g filter="url(#sim-drop-shadow-sm)">
        {/* End caps (slightly darker ceramic) */}
        <rect x={11} y={5.5} width={11} height={19} rx={4} fill="#c9a468" stroke={edge} strokeWidth={edgeWidth} />
        <rect x={58} y={5.5} width={11} height={19} rx={4} fill="#c9a468" stroke={edge} strokeWidth={edgeWidth} />
        {/* Slimmer middle body */}
        <rect x={19} y={7.5} width={42} height={15} fill="url(#sim-cylinder-tan)" stroke={edge} strokeWidth={edgeWidth} />
      </g>

      {/* Colour bands: 3 close together, then a gap, then the gold tolerance band */}
      <rect x={25} y={7.5} width={4.2} height={15} fill={BAND_COLORS[b1]} />
      <rect x={32} y={7.5} width={4.2} height={15} fill={BAND_COLORS[b2]} />
      <rect x={39} y={7.5} width={4.2} height={15} fill={BAND_COLORS[b3]} />
      <rect x={51} y={7.5} width={4.2} height={15} fill="#d4a017" />

      {/* Cylindrical shading over caps, body and bands so the bands wrap */}
      <rect x={11} y={5.5} width={11} height={19} rx={4} fill="url(#sim-cyl-shade)" />
      <rect x={58} y={5.5} width={11} height={19} rx={4} fill="url(#sim-cyl-shade)" />
      <rect x={19} y={7.5} width={42} height={15} fill="url(#sim-cyl-shade)" />

      {/* Specular streaks */}
      <rect x={23} y={9} width={34} height={1.6} rx={0.8} fill="#ffffff" opacity={0.32} />
      <rect x={13.5} y={7.4} width={6} height={1.5} rx={0.75} fill="#ffffff" opacity={0.45} />
      <rect x={60.5} y={7.4} width={6} height={1.5} rx={0.75} fill="#ffffff" opacity={0.45} />

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
