"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

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
      {/* Pin legs */}
      {pins.map((pin) => (
        <line key={`leg-${pin.id}`} x1={pin.x} y1={pin.y} x2={pin.x} y2={pin.y - 10} stroke="#9a9a9a" strokeWidth={2} />
      ))}

      {/* PCB module */}
      <rect
        x={2}
        y={2}
        width={60}
        height={60}
        rx={5}
        fill="#1f5fa8"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      {/* Corner screw holes */}
      {[[9, 9], [55, 9], [9, 55], [55, 55]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#123c6e" />
      ))}

      {/* Knob body */}
      <circle cx={32} cy={30} r={17} fill="#c9c9c9" stroke="#8a8a8a" strokeWidth={1} />
      <circle cx={32} cy={30} r={17} fill="none" stroke="#e8e8e8" strokeWidth={1} opacity={0.6} />
      <g transform={`rotate(${angle}, 32, 30)`}>
        <line x1={32} y1={30} x2={32} y2={16} stroke="#4a4a4a" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* Silkscreen pin labels */}
      <text x={14} y={68} textAnchor="middle" fill="#cfe3ff" fontSize={7}>GND</text>
      <text x={32} y={68} textAnchor="middle" fill="#cfe3ff" fontSize={7}>SIG</text>
      <text x={50} y={68} textAnchor="middle" fill="#cfe3ff" fontSize={7}>VCC</text>

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
