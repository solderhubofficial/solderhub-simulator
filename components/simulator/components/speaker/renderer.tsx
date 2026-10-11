"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const CX = 30
const CY = 30

// 8 ohm mini speaker, front view. Pins (see definition): positive (8,34),
// negative (52,34) — solder lugs on the frame rim. Black paper cone with
// concentric ribs inside a rubber surround and a steel basket.
function SpeakerRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isActive = simulation?.flags.isActive === true
  const edge = selected ? "var(--primary)" : "#08090b"

  return (
    <g data-component-id={component.id}>
      {/* Sound waves while driven */}
      {isActive && (
        <>
          <circle cx={CX} cy={CY} r={29} fill="none" stroke="#57aaff" strokeWidth={1.4} opacity={0.6} />
          <circle cx={CX} cy={CY} r={33} fill="none" stroke="#57aaff" strokeWidth={1.1} opacity={0.35} />
          <circle cx={CX} cy={CY} r={37} fill="none" stroke="#57aaff" strokeWidth={0.8} opacity={0.18} />
        </>
      )}

      {/* Solder lugs */}
      {pins.map((pin, i) => (
        <g key={`lug-${pin.id}`}>
          <rect x={pin.x - 5.5 + (i === 0 ? -1 : 1)} y={pin.y - 3.4} width={11} height={6.8} rx={1.4} fill="url(#sim-brass)" stroke="#7a5e16" strokeWidth={0.6} />
          <circle cx={pin.x} cy={pin.y} r={1.7} fill="#2a2108" />
        </g>
      ))}

      {/* Steel basket / frame */}
      <circle cx={CX} cy={CY} r={26} fill="url(#sim-steel)" stroke={edge} strokeWidth={selected ? 2.2 : 1.2} filter="url(#sim-drop-shadow)" />
      <circle cx={CX} cy={CY} r={24.4} fill="none" stroke="#ffffff" strokeWidth={0.7} opacity={0.6} />
      {/* Basket mounting holes */}
      {[45, 135, 225, 315].map((a) => {
        const r = 22
        const x = CX + r * Math.cos((a * Math.PI) / 180)
        const y = CY + r * Math.sin((a * Math.PI) / 180)
        return <circle key={a} cx={x} cy={y} r={1.5} fill="#15171a" stroke="#6b7077" strokeWidth={0.4} />
      })}

      {/* Rubber surround */}
      <circle cx={CX} cy={CY} r={19.5} fill="#16171a" stroke="#000000" strokeWidth={0.8} />
      <circle cx={CX} cy={CY} r={18.2} fill="none" stroke="#4a4e57" strokeWidth={0.7} opacity={0.7} />

      {/* Paper cone with ribs */}
      <circle cx={CX} cy={CY} r={16.6} fill="url(#sim-plastic-dome)" />
      {[14, 11.2, 8.4].map((r) => (
        <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="#000000" strokeWidth={0.7} opacity={0.55} />
      ))}
      {[13.4, 10.6, 7.8].map((r) => (
        <circle key={`hi-${r}`} cx={CX} cy={CY} r={r} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.12} />
      ))}

      {/* Dust cap */}
      <circle cx={CX} cy={CY} r={6.2} fill="url(#sim-plastic-dome)" stroke="#000000" strokeWidth={0.7} />
      <circle cx={CX} cy={CY} r={6.2} fill={isActive ? "#57aaff" : "#ffffff"} opacity={isActive ? 0.2 : 0.06} />
      <ellipse cx={CX - 2.2} cy={CY - 2.6} rx={2.6} ry={1.4} fill="#ffffff" opacity={0.28} transform={`rotate(-35 ${CX - 2.2} ${CY - 2.6})`} />
      <ellipse cx={CX - 9} cy={CY - 10} rx={6} ry={2} fill="#ffffff" opacity={0.1} transform={`rotate(-40 ${CX - 9} ${CY - 10})`} />

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

export const SpeakerRenderer = memo(SpeakerRendererInner)
