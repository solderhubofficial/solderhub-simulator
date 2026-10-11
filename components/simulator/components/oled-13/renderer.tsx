"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 280
const H = 150

function Oled13RendererInner({ component, pins, selected, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const line1 = typeof component.metadata.line1 === "string" ? component.metadata.line1 : "SolderHub"
  const line2 = typeof component.metadata.line2 === "string" ? component.metadata.line2 : "1.3-inch OLED"
  const backlight = component.metadata.backlight !== false

  return (
    <g data-component-id={component.id}>
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={8} fill="url(#sim-pcb-blue)" stroke={selected ? "var(--primary)" : "#123c6e"} strokeWidth={selected ? 2.5 : 1.5} filter="url(#sim-drop-shadow)" />
      {[[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={7} fill="#dce7eb" stroke="#153e5e" strokeWidth={2} />
          <circle cx={x} cy={y} r={3.5} fill="#0a192c" />
        </g>
      ))}
      <rect x={18} y={18} width={W - 36} height={H - 43} rx={4} fill="#05080d" stroke="#b6c4cc" strokeWidth={2} />
      <rect x={25} y={25} width={W - 50} height={H - 57} rx={2} fill={backlight ? "#07172f" : "#02050a"} stroke="#1e293b" strokeWidth={1} />
      {backlight && (
        <g fill="#5ee7ff" fontFamily="ui-monospace, monospace" fontWeight={600}>
          <text x={W / 2} y={65} textAnchor="middle" fontSize={17}>{line1.slice(0, 20)}</text>
          <text x={W / 2} y={91} textAnchor="middle" fontSize={13}>{line2.slice(0, 24)}</text>
          <path d="M 58 108 Q 75 95 92 108 T 126 108 T 160 108 T 194 108" fill="none" stroke="#24c6e8" strokeWidth={2} opacity={0.85} />
        </g>
      )}
      <text x={W / 2} y={H - 13} textAnchor="middle" fill="#dbeafe" fontSize={8} letterSpacing={0.5}>1.3-inch OLED · I2C</text>
      {pins.map((pin) => (
        <g key={pin.id}>
          <line x1={pin.x} y1={H - 5} x2={pin.x} y2={H} stroke="#d1d5db" strokeWidth={2} />
          <text x={pin.x} y={H - 8} textAnchor="middle" fill="#dbeafe" fontSize={6.5}>{pin.name}</text>
          <PinHitArea pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(e) => onPinPointerDown(pin.id, e)} />
        </g>
      ))}
    </g>
  )
}

export const Oled13Renderer = memo(Oled13RendererInner)
