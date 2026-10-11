"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 100
const H = 100

function Mq3RendererInner({ component, pins, selected, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const detected = component.metadata.detected === true

  return (
    <g data-component-id={component.id}>
      {/* MQ-series alcohol sensor metal can */}
      <rect x={8} y={18} width={W - 16} height={70} rx={7} fill="url(#sim-pcb-blue)" stroke={selected ? "var(--primary)" : "#123c6e"} strokeWidth={selected ? 2.5 : 1.5} filter="url(#sim-drop-shadow)" />
      {[[16, 26], [W - 16, 26], [16, 80], [W - 16, 80]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="#d4e6ed" stroke="#102b43" strokeWidth={1.5} />
      ))}
      <circle cx={W / 2} cy={49} r={31} fill="#f97316" stroke="#9a3412" strokeWidth={2} filter="url(#sim-drop-shadow-sm)" />
      <circle cx={W / 2} cy={49} r={22} fill="#b7b9b8" stroke="#4b5563" strokeWidth={2} />
      {Array.from({ length: 9 }).map((_, row) => Array.from({ length: 9 }).map((__, col) => (
        <circle key={`mesh-${row}-${col}`} cx={29 + col * 5.25} cy={28 + row * 5.25} r={1.35} fill="#626b70" opacity={0.9} />
      )))}
      <rect x={W / 2 - 9} y={72} width={18} height={12} rx={1} fill="#20252b" stroke="#080a0d" />
      <text x={W / 2} y={13} textAnchor="middle" fill="var(--foreground)" fontSize={8} fontWeight={700}>MQ-3</text>
      <text x={W / 2} y={94} textAnchor="middle" fill="#dbeafe" fontSize={6.5}>{detected ? "ALCOHOL DETECTED" : "ALCOHOL SENSOR"}</text>
      {pins.map((pin) => (
        <g key={pin.id}>
          <line x1={pin.x} y1={pin.y - 8} x2={pin.x} y2={pin.y} stroke="#c5c9cc" strokeWidth={2.5} />
          <text x={pin.x} y={pin.y - 12} textAnchor="middle" fill="var(--foreground)" fontSize={6.5}>{pin.name}</text>
          <PinHitArea pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(e) => onPinPointerDown(pin.id, e)} />
        </g>
      ))}
    </g>
  )
}

export const Mq3Renderer = memo(Mq3RendererInner)
