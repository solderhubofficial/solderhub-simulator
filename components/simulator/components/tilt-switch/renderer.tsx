"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function TiltSwitchRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const tilted = simulation?.flags.tilted === true || component.metadata.tilted === true
  const ballX = tilted ? 47 : 25
  const bodyStroke = selected ? "var(--primary)" : "#555c64"

  return (
    <g data-component-id={component.id}>
      <line x1={0} y1={34} x2={12} y2={34} stroke="#a7adb3" strokeWidth={2.5} />
      <line x1={60} y1={34} x2={72} y2={34} stroke="#a7adb3" strokeWidth={2.5} />
      <path
        d="M 12 34 L 16 10 Q 36 2 56 10 L 60 34 Z"
        fill="#b9bec4"
        stroke={bodyStroke}
        strokeWidth={selected ? 2 : 1.2}
        filter="url(#sim-drop-shadow-sm)"
      />
      <path d="M 18 15 Q 36 9 54 15" fill="none" stroke="#e9ecef" strokeWidth={2} opacity={0.8} />
      <circle cx={ballX} cy={25} r={6} fill="#6c737b" stroke="#3c4248" strokeWidth={1.2} />
      <line x1={18} y1={34} x2={18} y2={26} stroke="#b07c2c" strokeWidth={2} />
      <line x1={54} y1={34} x2={54} y2={26} stroke="#b07c2c" strokeWidth={2} />
      {tilted && <line x1={24} y1={34} x2={48} y2={34} stroke="#36c15a" strokeWidth={2.2} />}

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

export const TiltSwitchRenderer = memo(TiltSwitchRendererInner)
