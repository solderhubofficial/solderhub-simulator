"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

/** Original SolderHub vector artwork for a GY-521-style MPU-6050 breakout. */
function Mpu6050RendererInner({
  component, pins, selected, simulation, onPinClick, onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const tiltX = typeof simulation?.flags.tiltX === "number" ? simulation.flags.tiltX : 0
  const tiltY = typeof simulation?.flags.tiltY === "number" ? simulation.flags.tiltY : 0
  const label = ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"]
  const xs = [22, 40, 58, 76, 94, 112, 130, 148]
  return (
    <g data-component-id={component.id}>
      {xs.map((x) => <LeadV key={x} x={x} y1={106} y2={124} w={2.8} />)}
      <rect x={9} y={11} width={152} height={98} rx={9} fill="#0b554a" stroke={selected ? "var(--primary)" : "#062f2a"} strokeWidth={selected ? 2.5 : 1.3} filter="url(#sim-drop-shadow-sm)" />
      <path d="M 17 18 H 153 V 101 H 17 Z" fill="#126b5b" stroke="#2dd4bf" strokeOpacity={0.28} strokeWidth={1} />
      <circle cx={18} cy={20} r={3.5} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />
      <circle cx={152} cy={20} r={3.5} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />
      <circle cx={18} cy={100} r={3.5} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />
      <circle cx={152} cy={100} r={3.5} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />
      <rect x={46} y={35} width={78} height={54} rx={5} fill="#111827" stroke="#94a3b8" strokeWidth={1.5} />
      <rect x={53} y={42} width={64} height={40} rx={2} fill="#202b38" stroke="#475569" strokeWidth={1} />
      <text x={85} y={58} textAnchor="middle" fill="#e2e8f0" fontSize={8} fontWeight={800}>MPU-6050</text>
      <text x={85} y={70} textAnchor="middle" fill="#94a3b8" fontSize={5.4} fontWeight={700}>6-AXIS IMU</text>
      <rect x={25} y={29} width={14} height={24} rx={2} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      <rect x={132} y={37} width={12} height={25} rx={2} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />
      <rect x={29} y={69} width={10} height={15} rx={2} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      <circle cx={143} cy={88} r={3.2} fill={powered ? "#4ade80" : "#475569"} stroke="#0f172a" strokeWidth={1} />
      <path d={`M 133 27 l 6 -4 l 6 4 M 139 23 v 10`} fill="none" stroke="#99f6e4" strokeWidth={1.4} strokeLinecap="round" />
      <text x={85} y={24} textAnchor="middle" fill="#d1fae5" fontSize={6.8} fontWeight={800}>GY-521</text>
      <text x={85} y={98} textAnchor="middle" fill="#99f6e4" fontSize={5.2} fontWeight={700}>{powered ? "POWERED" : "IMU MODULE"}</text>
      <g transform={`translate(85 62) rotate(${Math.max(-45, Math.min(45, tiltY))})`} opacity={0.9}>
        <path d="M 0 0 L 0 -12" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        <circle cx={0} cy={-12} r={2} fill="#fbbf24" />
      </g>
      <g fill="#e2e8f0" fontSize={4.7} fontWeight={800} textAnchor="middle">
        {label.map((text, i) => <text key={text} x={xs[i]} y={119}>{text}</text>)}
      </g>
      <text x={85} y={7} textAnchor="middle" fill="#94a3b8" fontSize={5.3} fontWeight={700}>X {tiltX}° • Y {tiltY}°</text>
      {pins.map((pin) => <PinHitArea key={pin.id} pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(event) => onPinPointerDown(pin.id, event)} />)}
    </g>
  )
}
export const Mpu6050Renderer = memo(Mpu6050RendererInner)
