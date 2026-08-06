"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function IrReceiverRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const pulseActive = simulation?.flags.pulseActive === true || component.metadata.pulseActive === true

  return (
    <g data-component-id={component.id}>
      <path
        d="M 12 52 L 12 20 A 21 18 0 0 1 54 20 L 54 52 Z"
        fill={pulseActive ? "#311c1c" : "#20242a"}
        stroke={selected ? "var(--primary)" : "#080a0d"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow-sm)"
      />
      <path d="M 18 23 A 15 12 0 0 1 48 23" fill="none" stroke="#4b525c" strokeWidth={2} />
      <circle cx={33} cy={33} r={7} fill={powered ? (pulseActive ? "#dc3f3f" : "#592828") : "#17191c"} />
      <ellipse cx={27} cy={18} rx={5} ry={3} fill="#ffffff" opacity={0.12} />
      {[19, 33, 47].map((x) => (
        <line key={x} x1={x} y1={52} x2={x} y2={76} stroke="#a8adb4" strokeWidth={2.2} />
      ))}
      <text x={19} y={63} textAnchor="middle" fill="#626a73" fontSize={6}>OUT</text>
      <text x={33} y={63} textAnchor="middle" fill="#626a73" fontSize={6}>G</text>
      <text x={47} y={63} textAnchor="middle" fill="#626a73" fontSize={6}>V</text>

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

export const IrReceiverRenderer = memo(IrReceiverRendererInner)
