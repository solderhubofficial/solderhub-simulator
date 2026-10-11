"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

// SPDT slide switch. Pins (see definition): com (16,54), nc (32,54),
// no (48,54). Off: COM is joined to NC. On: COM is joined to NO.
// The pin labels are fixed to the pins (they used to swap with the switch
// state, which mislabelled the NC/NO legs); the active connection is shown
// by tinting the two joined legs and drawing a bridge between them.
function SlideSwitchRendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isOn = component.metadata.on === true
  const comPin = pins.find((pin) => pin.name === "com")
  const noPin = pins.find((pin) => pin.name === "no")
  const ncPin = pins.find((pin) => pin.name === "nc")
  const throwPin = isOn ? noPin : ncPin
  const joined = (name: string) => name === "com" || (throwPin && name === throwPin.name)
  const handleX = isOn ? 33 : 17
  const edge = selected ? "var(--primary)" : "#15171a"

  return (
    <g data-component-id={component.id}>
      {/* Legs */}
      {pins.map((pin) => (
        <g key={`leg-${pin.id}`}>
          <LeadV x={pin.x} y1={42} y2={pin.y} w={2.4} />
          {joined(pin.name) && <rect x={pin.x - 1.2} y={42} width={2.4} height={pin.y - 42} rx={0.6} fill="#2e7ef0" opacity={0.55} />}
        </g>
      ))}
      {comPin && throwPin && (
        <rect
          x={Math.min(comPin.x, throwPin.x) - 1.2}
          y={47.4}
          width={Math.abs(throwPin.x - comPin.x) + 2.4}
          height={2.2}
          rx={1.1}
          fill="#2e7ef0"
          opacity={0.9}
        />
      )}

      {/* Mounting tabs */}
      {[2, 54].map((x) => (
        <g key={x}>
          <rect x={x} y={22} width={8} height={11} rx={1.8} fill="url(#sim-steel)" stroke="#6a6f76" strokeWidth={0.6} />
          <circle cx={x + 4} cy={27.5} r={1.9} fill="#14161a" stroke="#8e939a" strokeWidth={0.4} />
        </g>
      ))}

      {/* Black body */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={7} y={14} width={50} height={29} rx={3} fill="url(#sim-plastic-dark)" stroke={edge} strokeWidth={selected ? 2 : 0.8} />
      </g>

      {/* Steel top plate with the actuator slot */}
      <rect x={9.4} y={16.4} width={45.2} height={24.2} rx={2} fill="url(#sim-steel)" stroke="#6a6f76" strokeWidth={0.6} />
      <rect x={10.4} y={17.2} width={43.2} height={1.1} rx={0.55} fill="#ffffff" opacity={0.6} />
      <rect x={14} y={23} width={36} height={12} rx={3.5} fill="#0b0c0e" />
      <rect x={14} y={34} width={36} height={1} rx={0.5} fill="#ffffff" opacity={0.18} />

      {/* Sliding actuator (ribbed) */}
      <g style={{ transition: "transform 110ms ease-out", transform: `translateX(${handleX}px)` }}>
        <rect x={0} y={20.6} width={14} height={16.8} rx={2.4} fill="url(#sim-plastic-dark)" stroke="#000000" strokeWidth={0.7} />
        {[3.2, 5.9, 8.6, 11.3].map((x) => (
          <line key={x} x1={x} y1={22.8} x2={x} y2={35.2} stroke="#000000" strokeWidth={0.8} opacity={0.75} />
        ))}
        <rect x={1.2} y={21.6} width={11.6} height={1.2} rx={0.6} fill="#ffffff" opacity={0.2} />
      </g>

      <text x={32} y={11} textAnchor="middle" fill="#8892b0" fontSize={7} fontWeight={700}>
        {isOn ? "ON" : "OFF"}
      </text>

      {/* Fixed pin labels, set under each leg */}
      <g fill="#8892b0" fontSize={5} fontWeight={700} textAnchor="middle">
        <text x={comPin?.x ?? 16} y={62}>COM</text>
        <text x={ncPin?.x ?? 32} y={62}>NC</text>
        <text x={noPin?.x ?? 48} y={62}>NO</text>
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

export const SlideSwitchRenderer = memo(SlideSwitchRendererInner)
