"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

// VS1838B-style IR receiver. Pins (see definition): out (19,76),
// gnd (33,76), vcc (47,76). Black epoxy body with a convex IR lens and
// three flat tinned legs.
function IrReceiverRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const pulseActive = simulation?.flags.pulseActive === true || component.metadata.pulseActive === true
  const body = "M 12 52 V 20 A 21 17 0 0 1 54 20 V 52 Z"
  const lensFill = powered ? (pulseActive ? "#e0443f" : "#6a2a2a") : "#1a1315"

  return (
    <g data-component-id={component.id}>
      {/* Legs */}
      {[19, 33, 47].map((x) => (
        <LeadV key={x} x={x} y1={52} y2={76} w={2.4} />
      ))}

      {/* Epoxy body */}
      <path
        d={body}
        fill="url(#sim-plastic-dark-h)"
        stroke={selected ? "var(--primary)" : "#050607"}
        strokeWidth={selected ? 2.5 : 1.2}
        filter="url(#sim-drop-shadow-sm)"
      />
      <path d={body} fill="url(#sim-cyl-shade-v)" opacity={0.28} />
      {/* Mould parting line and base rim */}
      <line x1={12.6} y1={46} x2={53.4} y2={46} stroke="#000000" strokeWidth={0.8} opacity={0.6} />
      <rect x={12.6} y={46.8} width={40.8} height={0.7} fill="#ffffff" opacity={0.12} />
      <path d="M 16 19 A 17 13.4 0 0 1 28 6.6" fill="none" stroke="#ffffff" strokeWidth={1.2} strokeLinecap="round" opacity={0.2} />

      {/* Convex lens window */}
      {pulseActive && powered && <circle cx={33} cy={28} r={10} fill="#ff4a3d" opacity={0.55} filter="url(#sim-glow-blur-sm)" />}
      <circle cx={33} cy={28} r={10.4} fill="#0a0b0d" stroke="#2d3036" strokeWidth={0.8} />
      <circle cx={33} cy={28} r={8.4} fill={lensFill} stroke="#000000" strokeWidth={0.6} style={{ transition: "fill 80ms ease-out" }} />
      <circle cx={33} cy={28} r={8.4} fill="url(#sim-dome-sheen)" />
      <ellipse cx={29.6} cy={24.6} rx={3} ry={1.7} fill="#ffffff" opacity={0.3} transform="rotate(-35 29.6 24.6)" />

      {/* Pin names printed on the lower body */}
      <g fill="#8d95a1" fontSize={4.8} fontWeight={700} textAnchor="middle">
        <text x={19} y={43.2}>OUT</text>
        <text x={33} y={43.2}>GND</text>
        <text x={47} y={43.2}>VCC</text>
      </g>

      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(event) => onPinPointerDown(pin.id, event)}
        />
      ))}
    </g>
  )
}

export const IrReceiverRenderer = memo(IrReceiverRendererInner)
