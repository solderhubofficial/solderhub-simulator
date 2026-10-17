"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

/** Original SolderHub vector artwork for an MPU-9250 / AK8963 9-axis breakout. */
function Mpu9250RendererInner({
  component, pins, selected, simulation, onPinClick, onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const tiltX = typeof simulation?.flags.tiltX === "number" ? simulation.flags.tiltX : 0
  const tiltY = typeof simulation?.flags.tiltY === "number" ? simulation.flags.tiltY : 0
  const labels = ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"]
  const xs = [22, 40, 58, 76, 94, 112, 130, 148]
  return (
    <g data-component-id={component.id}>
      {xs.map((x) => <LeadV key={x} x={x} y1={106} y2={124} w={2.8} />)}
      <rect x={9} y={11} width={152} height={98} rx={9} fill="#153b66" stroke={selected ? "var(--primary)" : "#0b2544"} strokeWidth={selected ? 2.5 : 1.3} filter="url(#sim-drop-shadow-sm)" />
      <path d="M 17 18 H 153 V 101 H 17 Z" fill="#1d4f7e" stroke="#60a5fa" strokeOpacity={0.45} strokeWidth={1} />
      {[ [18,20], [152,20], [18,100], [152,100] ].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#d1d5db" stroke="#64748b" strokeWidth={1} />)}
      <rect x={39} y={32} width={80} height={51} rx={4} fill="#111827" stroke="#9ca3af" strokeWidth={1.5} />
      <rect x={45} y={38} width={68} height={39} rx={2} fill="#202b38" stroke="#475569" strokeWidth={1} />
      <text x={79} y={53} textAnchor="middle" fill="#f8fafc" fontSize={8} fontWeight={800}>MPU-9250</text>
      <text x={79} y={64} textAnchor="middle" fill="#93c5fd" fontSize={5.3} fontWeight={700}>9-AXIS IMU</text>
      <rect x={123} y={42} width={21} height={24} rx={2} fill="#0f172a" stroke="#cbd5e1" strokeWidth={1} />
      <text x={133.5} y={52} textAnchor="middle" fill="#e2e8f0" fontSize={4.6} fontWeight={800}>AK</text>
      <text x={133.5} y={59} textAnchor="middle" fill="#93c5fd" fontSize={4.4} fontWeight={700}>8963</text>
      <rect x={25} y={34} width={9} height={18} rx={1.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      <rect x={25} y={66} width={9} height={18} rx={1.5} fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
      <circle cx={143} cy={88} r={3.2} fill={powered ? "#4ade80" : "#475569"} stroke="#0f172a" strokeWidth={1} />
      <text x={85} y={25} textAnchor="middle" fill="#dbeafe" fontSize={6.8} fontWeight={800}>ACCEL • GYRO • MAG</text>
      <text x={85} y={98} textAnchor="middle" fill="#bfdbfe" fontSize={5.2} fontWeight={700}>{powered ? "POWERED • VISUAL MODEL" : "MPU-9250 MODULE"}</text>
      <g transform={`translate(79 58) rotate(${Math.max(-45, Math.min(45, tiltY))})`} opacity={0.95}>
        <path d="M 0 0 L 0 -11" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        <circle cx={0} cy={-11} r={2} fill="#fbbf24" />
      </g>
      <g fill="#e2e8f0" fontSize={4.7} fontWeight={800} textAnchor="middle">
        {labels.map((label, i) => <text key={label} x={xs[i]} y={119}>{label}</text>)}
      </g>
      <text x={85} y={7} textAnchor="middle" fill="#bfdbfe" fontSize={5.3} fontWeight={700}>X {tiltX}° • Y {tiltY}°</text>
      {pins.map((pin) => <PinHitArea key={pin.id} pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(event) => onPinPointerDown(pin.id, event)} />)}
    </g>
  )
}
export const Mpu9250Renderer = memo(Mpu9250RendererInner)
