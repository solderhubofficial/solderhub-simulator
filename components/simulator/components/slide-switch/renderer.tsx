"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

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

  return (
    <g data-component-id={component.id}>
      <rect x={8} y={10} width={48} height={36} rx={6} fill="#f2f2f2" stroke={selected ? "var(--primary)" : "#555"} strokeWidth={selected ? 2 : 1} />
      <rect x={16} y={16} width={32} height={20} rx={4} fill="#d9d9d9" />
      <rect
        x={isOn ? 36 : 16}
        y={18}
        width={12}
        height={16}
        rx={3}
        fill={isOn ? "#4393ff" : "#7c7c7c"}
      />
      <text x={32} y={12} textAnchor="middle" fontSize="8" fill="#333" fontWeight="600">
        {isOn ? "ON" : "OFF"}
      </text>
      <text x={16} y={54} textAnchor="middle" fontSize="7" fill="#666">
        COM
      </text>
      <text x={32} y={54} textAnchor="middle" fontSize="7" fill="#666">
        {isOn ? "NO" : "NC"}
      </text>
      <text x={48} y={54} textAnchor="middle" fontSize="7" fill="#666">
        {isOn ? "NC" : "NO"}
      </text>
      {pins.map((pin) => (
        <PinHitArea
          key={pin.id}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(e) => onPinPointerDown(pin.id, e)}
        />
      ))}
      {comPin && (isOn ? noPin : ncPin) && (
        <line
          x1={comPin.x}
          y1={comPin.y - 4}
          x2={(isOn ? noPin : ncPin)!.x}
          y2={(isOn ? noPin : ncPin)!.y - 4}
          stroke="#2e7ef0"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      <circle cx={comPin?.x ?? 0} cy={comPin?.y ?? 0} r={4} fill="#2f2f2f" />
    </g>
  )
}

export const SlideSwitchRenderer = memo(SlideSwitchRendererInner)
