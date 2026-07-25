"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function SpeakerRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isActive = simulation?.flags.isActive === true
  const glow = isActive ? "#57aaff" : "#b3b3b3"

  return (
    <g data-component-id={component.id}>
      <polygon points="12,12 36,30 12,48" fill="#6b6b6b" stroke={selected ? "var(--primary)" : "#3a3a3a"} strokeWidth={selected ? 2 : 1} />
      <path d="M 36 18 C 46 28, 46 34, 36 44" fill="none" stroke={glow} strokeWidth={3} />
      <path d="M 40 14 C 52 28, 52 34, 40 50" fill="none" stroke={glow} strokeWidth={2} opacity={isActive ? 0.9 : 0.4} />
      <circle cx={28} cy={30} r={4} fill="#272727" />
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
