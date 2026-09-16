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
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      {/* Corner screw holes */}
      {[[9, 9], [55, 9], [9, 55], [55, 55]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#123c6e" />
      ))}

      {/* Knob body */}
      <circle cx={32} cy={30} r={17} fill="url(#sim-metal)" stroke="#8a8a8a" strokeWidth={1} />
      <circle cx={32} cy={30} r={17} fill="none" stroke="#e8e8e8" strokeWidth={1} opacity={0.6} />
      {/* Knurled grip ridges around the rim, like a real potentiometer knob */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i * 360) / 18
        return (
          <line
            key={i}
            x1={32}
            y1={14.5}
            x2={32}
            y2={17.5}
            stroke="#6b6b6b"
            strokeWidth={0.9}
            opacity={0.55}
            transform={`rotate(${a}, 32, 30)`}
          />
        )
      })}
      {/* Static dial-plate tick marks (sweep range) */}
      {[-135, -67.5, 0, 67.5, 135].map((a) => (
        <line
          key={a}
          x1={32}
          y1={9}
          x2={32}
          y2={12}
          stroke="#dbe6ff"
          strokeWidth={1.2}
          opacity={0.7}
          transform={`rotate(${a}, 32, 30)`}
        />
      ))}
      <g transform={`rotate(${angle}, 32, 30)`}>
        <line x1={32} y1={30} x2={32} y2={16} stroke="#2a2a2a" strokeWidth={3} strokeLinecap="round" />
        <line x1={32} y1={30} x2={32} y2={16} stroke="#f0a000" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx={32} cy={16} r={1.4} fill="#f0a000" />
      </g>
      <circle cx={32} cy={30} r={3} fill="#e4e4e4" stroke="#8a8a8a" strokeWidth={0.6} />

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
