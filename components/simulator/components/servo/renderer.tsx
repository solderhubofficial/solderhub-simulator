"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function ServoRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const angle = typeof simulation?.flags.angle === "number" ? simulation.flags.angle : 90
  const powered = simulation?.flags.powered === true
  const hornRotation = angle - 90

  return (
    <g data-component-id={component.id}>
      <rect
        x={18}
        y={29}
        width={60}
        height={49}
        rx={5}
        fill="#246dcc"
        stroke={selected ? "var(--primary)" : "#164b91"}
        strokeWidth={selected ? 2.5 : 1.4}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={7} y={38} width={82} height={13} rx={3} fill="#2d80e1" stroke="#164b91" />
      <circle cx={48} cy={27} r={14} fill="#2d80e1" stroke="#164b91" strokeWidth={1.5} />
      <circle cx={48} cy={27} r={5} fill="#f3f4f6" stroke="#9ca3af" />
      <g transform={`rotate(${hornRotation} 48 27)`}>
        <rect x={45} y={4} width={6} height={29} rx={3} fill="#f8fafc" stroke="#aab0b7" />
        <circle cx={48} cy={8} r={2} fill="#9ca3af" />
      </g>
      <text x={48} y={61} textAnchor="middle" fill="#ffffff" fontSize={10} fontWeight={700}>
        SG90
      </text>
      <text x={48} y={73} textAnchor="middle" fill="#dbeafe" fontSize={7}>
        {powered ? `${angle}°` : "OFF"}
      </text>
      <line x1={32} y1={78} x2={32} y2={92} stroke="#3f322c" strokeWidth={3} />
      <line x1={48} y1={78} x2={48} y2={92} stroke="#d83b35" strokeWidth={3} />
      <line x1={64} y1={78} x2={64} y2={92} stroke="#e6a52f" strokeWidth={3} />
      <text x={32} y={87} textAnchor="middle" fill="#ffffff" fontSize={5}>G</text>
      <text x={48} y={87} textAnchor="middle" fill="#ffffff" fontSize={5}>V</text>
      <text x={64} y={87} textAnchor="middle" fill="#ffffff" fontSize={5}>S</text>

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

export const ServoRenderer = memo(ServoRendererInner)
