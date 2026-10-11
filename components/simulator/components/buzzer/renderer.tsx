"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

// 12 mm electromagnetic buzzer, seen slightly from above. Pins (see
// definition): positive (17,64), negative (33,58) — the longer lead is +.
function BuzzerRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isActive = simulation?.flags.isActive === true
  const edge = selected ? "var(--primary)" : "#000000"

  return (
    <g data-component-id={component.id}>
      {/* Sound waves while driven */}
      {isActive && (
        <>
          <path d="M 4 -2 A 28 24 0 0 1 46 -2" fill="none" stroke="#f0a000" strokeWidth={1.3} strokeLinecap="round" opacity={0.7} />
          <path d="M -1 -7 A 33 28 0 0 1 51 -7" fill="none" stroke="#f0a000" strokeWidth={1.1} strokeLinecap="round" opacity={0.42} />
          <path d="M -6 -12 A 38 32 0 0 1 56 -12" fill="none" stroke="#f0a000" strokeWidth={0.9} strokeLinecap="round" opacity={0.22} />
        </>
      )}

      {/* Leads */}
      <LeadV x={17} y1={42} y2={64} w={2} />
      <LeadV x={33} y1={42} y2={58} w={2} />
      <text x={10.5} y={62} fill="#8892b0" fontSize={8} fontWeight={700}>+</text>

      <g filter="url(#sim-drop-shadow-sm)">
        {/* Side wall of the cylinder */}
        <path d="M 5 20 V 25 A 20 18 0 0 0 45 25 V 20 Z" fill="url(#sim-plastic-dark-h)" stroke={edge} strokeWidth={selected ? 2 : 0.8} />
        {/* Top face */}
        <ellipse cx={25} cy={20} rx={20} ry={18} fill="url(#sim-plastic-dome)" stroke={edge} strokeWidth={selected ? 2 : 1} />
      </g>
      {/* Rim chamfer + recessed ring */}
      <ellipse cx={25} cy={20} rx={19} ry={17} fill="none" stroke="#6a6f78" strokeWidth={0.6} opacity={0.6} />
      <ellipse cx={25} cy={20} rx={16.2} ry={14.4} fill="none" stroke="#000000" strokeWidth={1} opacity={0.55} />

      {/* Sealing sticker with the sound hole */}
      <ellipse cx={25} cy={20} rx={13.6} ry={12} fill="#15171b" stroke="#2b2e34" strokeWidth={0.6} />
      <ellipse cx={25} cy={20} rx={3.4} ry={3} fill="#000000" stroke="#3b3f47" strokeWidth={0.7} />
      <ellipse cx={25} cy={20} rx={1.4} ry={1.2} fill={isActive ? "#f0a000" : "#0b0c0e"} opacity={isActive ? 0.9 : 1} />

      {/* Polarity mark + sheen */}
      <text x={10} y={13.5} fill="#cfd4dc" fontSize={7.5} fontWeight={700}>+</text>
      <ellipse cx={17} cy={11.5} rx={7} ry={2.8} fill="#ffffff" opacity={0.14} transform="rotate(-24 17 11.5)" />

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

export const BuzzerRenderer = memo(BuzzerRendererInner)
