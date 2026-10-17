"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

const W = 72

// SolderHub-native renderer based on the waterproof DS18B20 module form factor.
// Sensor assets are drawn inline; no image files are committed to the repository.
function Ds18b20RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const temperature = typeof simulation?.flags.temperature === "number"
    ? simulation.flags.temperature
    : typeof component.metadata.temperature === "number"
      ? component.metadata.temperature
      : 24
  const powered = simulation ? simulation.flags.powered !== false : true
  const edge = selected ? "var(--primary)" : "#68717d"

  return (
    <g data-component-id={component.id}>
      {pins.map((pin) => (
        <LeadV key={`lead-${pin.id}`} x={pin.x} y1={79} y2={pin.y} w={2.2} kind="gold" />
      ))}
      <g filter="url(#sim-drop-shadow)">
        <rect x={13} y={5} width={46} height={43} rx={17} fill="#aeb8c2" stroke={edge} strokeWidth={selected ? 2.4 : 1.2} />
        <rect x={16} y={8} width={40} height={37} rx={15} fill="url(#sim-metal)" stroke="#e7edf2" strokeWidth={0.7} />
        <ellipse cx={36} cy={9} rx={17} ry={3.3} fill="#eef3f7" stroke="#77818b" strokeWidth={0.7} />
        <path d="M22 15 Q19 26 23 38" fill="none" stroke="#ffffff" strokeWidth={1.6} opacity={0.65} />
        <rect x={25} y={44} width={22} height={8} rx={2} fill="#4b5563" stroke="#242a32" strokeWidth={0.8} />
      </g>
      <path d="M29 52 C29 57 20 60 20 68" fill="none" stroke="#111827" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M36 52 C36 58 36 61 36 68" fill="none" stroke="#eab308" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M43 52 C43 57 52 60 52 68" fill="none" stroke="#dc2626" strokeWidth={3.2} strokeLinecap="round" />
      <rect x={3} y={68} width={W - 6} height={12} rx={3} fill="#111827" stroke={edge} strokeWidth={selected ? 2 : 0.8} />
      <text x={W / 2} y={76.2} textAnchor="middle" fill="#f8fafc" fontSize={6.2} fontWeight={700}>DS18B20</text>
      <g opacity={powered ? 1 : 0.35}>
        <rect x={7} y={84} width={W - 14} height={14} rx={3} fill="#0d1117" stroke="#2a2f38" strokeWidth={1} />
        <text x={W / 2} y={93.5} textAnchor="middle" fill="#50FA7B" fontSize={7.5} fontFamily="ui-monospace, monospace">
          {temperature.toFixed(2)}°C
        </text>
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

export const Ds18b20Renderer = memo(Ds18b20RendererInner)
