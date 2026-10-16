"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

/** Original SolderHub SVG-style vector artwork for the common HC-SR501 module. */
function HcSr501RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const motion = simulation?.flags.motionDetected === true
  const leadX = [38, 56, 74]

  return (
    <g data-component-id={component.id}>
      {leadX.map((x) => <LeadV key={x} x={x} y1={82} y2={100} w={3} />)}
      <circle cx={56} cy={43} r={37} fill="#d9dce1" stroke={selected ? "var(--primary)" : "#8a9099"} strokeWidth={selected ? 2.5 : 1.2} />
      <circle cx={56} cy={43} r={31} fill="#f2f3f5" stroke="#b7bdc6" strokeWidth={1} />
      <path d="M 31 24 Q 56 8 81 24 M 27 34 Q 56 18 85 34 M 25 44 Q 56 29 87 44 M 28 54 Q 56 41 84 54 M 34 64 Q 56 53 78 64" fill="none" stroke="#c1c6ce" strokeWidth={1} />
      <circle cx={56} cy={43} r={12} fill="#e4e7ec" stroke="#c0c6cf" strokeWidth={1} />
      <circle cx={56} cy={43} r={5} fill={motion ? "#f59e0b" : "#a6adb8"} opacity={0.9} />
      <rect x={19} y={73} width={74} height={12} rx={2} fill="#1f6b48" stroke="#124a31" strokeWidth={1} />
      <rect x={27} y={76} width={14} height={6} rx={1} fill="#c7a55a" />
      <rect x={46} y={76} width={14} height={6} rx={1} fill="#c7a55a" />
      <rect x={65} y={76} width={14} height={6} rx={1} fill="#c7a55a" />
      <text x={56} y={69} textAnchor="middle" fill="#d9f99d" fontSize={5.8} fontWeight={800}>HC-SR501</text>
      <circle cx={87} cy={17} r={3} fill={powered ? (motion ? "#f59e0b" : "#22c55e") : "#4b5563"} stroke="#1f2937" strokeWidth={0.8} />
      <g fill="#e5e7eb" fontSize={5.4} fontWeight={700} textAnchor="middle">
        <text x={38} y={95}>VCC</text><text x={56} y={95}>OUT</text><text x={74} y={95}>GND</text>
      </g>
      <text x={56} y={61} textAnchor="middle" fill={motion ? "#b45309" : "#475569"} fontSize={5.6} fontWeight={800}>
        {motion ? "MOTION" : "IDLE"}
      </text>
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(event) => onPinPointerDown(pin.id, event)} />
      ))}
    </g>
  )
}

export const HcSr501Renderer = memo(HcSr501RendererInner)
