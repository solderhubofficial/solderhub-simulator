"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function RelayRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isEnergized = simulation?.flags.isEnergized === true
  const rightPins = pins.filter((p) => p.name === "NO" || p.name === "COM" || p.name === "NC")

  return (
    <g data-component-id={component.id}>
      {/* PCB */}
      <rect
        x={0}
        y={0}
        width={118}
        height={96}
        rx={4}
        fill="url(#sim-pcb-red)"
        stroke={selected ? "var(--primary)" : "#8f1f1f"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={3} y={3} width={112} height={90} rx={3} fill="none" stroke="#d96a6a" strokeWidth={0.75} />

      {/* Relay can (blue label box) */}
      <rect x={34} y={20} width={50} height={56} rx={3} fill="#2f6fd4" stroke="#1f4d99" />
      <rect x={36} y={22} width={46} height={10} rx={2} fill="#ffffff" opacity={0.12} />
      <text x={59} y={44} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={700}>
        Relay
      </text>
      <text x={59} y={58} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={700}>
        Module
      </text>

      {/* PWR / LED1 indicator dots (silkscreen) */}
      <circle cx={16} cy={20} r={2.5} fill={isEnergized ? "#f0a000" : "#3a3a3a"} stroke="#6b1414" />
      <text x={16} y={14} textAnchor="middle" fill="#f0d0d0" fontSize={6}>
        PWR
      </text>
      <circle cx={16} cy={76} r={2.5} fill={isEnergized ? "#37e05e" : "#3a3a3a"} stroke="#6b1414" />
      <text x={16} y={90} textAnchor="middle" fill="#f0d0d0" fontSize={6}>
        LED1
      </text>

      {/* Left header pins + labels (GND / IN) */}
      <line x1={-6} y1={62} x2={4} y2={62} stroke="#c9b037" strokeWidth={2} />
      <line x1={-6} y1={82} x2={4} y2={82} stroke="#c9b037" strokeWidth={2} />
      <text x={8} y={65} fill="#f0d0d0" fontSize={7}>
        GND
      </text>
      <text x={8} y={85} fill="#f0d0d0" fontSize={7}>
        IN
      </text>

      {/* Right screw terminal block */}
      <rect x={92} y={30} width={22} height={62} rx={2} fill="#3a7a3a" stroke="#1f4a1f" />
      {[42, 62, 82].map((y) => (
        <circle key={y} cx={103} cy={y} r={3} fill="#1f4a1f" stroke="#0f2f0f" />
      ))}
      <text x={90} y={38} textAnchor="end" fill="#f0d0d0" fontSize={7}>
        NO
      </text>
      <text x={90} y={65} textAnchor="end" fill="#f0d0d0" fontSize={7}>
        COM
      </text>
      <text x={90} y={86} textAnchor="end" fill="#f0d0d0" fontSize={7}>
        NC
      </text>
      {rightPins.map((pin) => (
        <line key={`lead-${pin.id}`} x1={114} y1={pin.y} x2={124} y2={pin.y} stroke="#c9b037" strokeWidth={2} />
      ))}

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

export const RelayRenderer = memo(RelayRendererInner)
