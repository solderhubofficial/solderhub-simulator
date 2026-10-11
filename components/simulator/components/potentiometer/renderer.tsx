"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

const CX = 32
const CY = 29

// Rotary potentiometer breakout. Pins (see definition): gnd (14,72),
// wiper (32,72), vcc (50,72). A ribbed black knob sits on a steel can,
// with a printed dial scale on the board and a 3-pin gold header below.
function PotentiometerRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const position = typeof simulation?.flags.position === "number"
    ? simulation.flags.position
    : typeof component.metadata.position === "number"
      ? component.metadata.position
      : 0.5
  const angle = -135 + position * 270

  return (
    <g data-component-id={component.id}>
      {/* Header pins poking out below the board */}
      {pins.map((pin) => (
        <LeadV key={`leg-${pin.id}`} x={pin.x} y1={60} y2={pin.y} w={2.4} kind="gold" />
      ))}

      {/* PCB */}
      <rect
        x={2}
        y={2}
        width={60}
        height={58}
        rx={4.5}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#0c3558"}
        strokeWidth={selected ? 2.5 : 1.2}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={3.4} y={3.4} width={57.2} height={55.2} rx={3.4} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.18} />
      {[[8, 8], [56, 8]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={2.3} fill="#d8b24c" />
          <circle cx={cx} cy={cy} r={1.4} fill="#0a2740" />
        </g>
      ))}

      {/* Black header housing */}
      <rect x={6} y={55} width={52} height={7} rx={1} fill="url(#sim-plastic-dark)" />
      {pins.map((pin) => (
        <rect key={`hole-${pin.id}`} x={pin.x - 3} y={56.6} width={6} height={4} rx={0.6} fill="#050607" />
      ))}

      {/* Printed dial scale */}
      <g stroke="#e6f0ff" strokeLinecap="round" opacity={0.75}>
        {[-135, -108, -81, -54, -27, 0, 27, 54, 81, 108, 135].map((a, i) => (
          <line
            key={a}
            x1={CX}
            y1={CY - 24.6}
            x2={CX}
            y2={CY - (i % 5 === 0 ? 21.2 : 22.6)}
            strokeWidth={i % 5 === 0 ? 1.1 : 0.7}
            transform={`rotate(${a} ${CX} ${CY})`}
          />
        ))}
      </g>

      {/* Steel can */}
      <circle cx={CX} cy={CY} r={19.5} fill="url(#sim-steel)" stroke="#5b6066" strokeWidth={0.8} filter="url(#sim-drop-shadow-sm)" />
      <circle cx={CX} cy={CY} r={17.6} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.55} />

      {/* Ribbed knob */}
      <circle cx={CX} cy={CY} r={14.4} fill="url(#sim-plastic-dark)" stroke="#07080a" strokeWidth={0.8} />
      {Array.from({ length: 28 }, (_, i) => (
        <line
          key={i}
          x1={CX}
          y1={CY - 14.2}
          x2={CX}
          y2={CY - 11.8}
          stroke="#000000"
          strokeWidth={0.7}
          opacity={0.7}
          transform={`rotate(${(i * 360) / 28} ${CX} ${CY})`}
        />
      ))}
      <circle cx={CX} cy={CY} r={10.4} fill="url(#sim-plastic-dome)" stroke="#2c2f36" strokeWidth={0.6} />
      <ellipse cx={CX - 3.6} cy={CY - 5.4} rx={5} ry={2.6} fill="#ffffff" opacity={0.16} transform={`rotate(-30 ${CX - 3.6} ${CY - 5.4})`} />

      {/* Pointer rotates with the wiper position */}
      <g transform={`rotate(${angle} ${CX} ${CY})`}>
        <rect x={CX - 1.3} y={CY - 13.6} width={2.6} height={9.5} rx={1.3} fill="#ff9a1f" />
        <rect x={CX - 0.5} y={CY - 13} width={1} height={8} rx={0.5} fill="#ffd58a" opacity={0.8} />
      </g>

      {/* Silkscreen pin labels */}
      <g fill="#e6f0ff" fontSize={5.2} fontWeight={600} textAnchor="middle">
        <text x={14} y={53}>GND</text>
        <text x={32} y={53}>SIG</text>
        <text x={50} y={53}>VCC</text>
      </g>

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

export const PotentiometerRenderer = memo(PotentiometerRendererInner)
