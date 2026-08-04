"use client"

import { memo } from "react"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import type { ComponentRendererProps } from "@/types/simulator"

function HcSr04RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const distanceCm =
    typeof simulation?.flags.distanceCm === "number"
      ? simulation.flags.distanceCm
      : typeof component.metadata.distanceCm === "number"
        ? component.metadata.distanceCm
        : 100
  const triggered = simulation?.flags.triggered === true

  return (
    <g data-component-id={component.id}>
      {pins.map((pin) => (
        <line
          key={`leg-${pin.id}`}
          x1={pin.x}
          y1={pin.y}
          x2={pin.x}
          y2={46}
          stroke="#b6b8bd"
          strokeWidth={2}
        />
      ))}

      <rect
        x={1}
        y={1}
        width={86}
        height={45}
        rx={3}
        fill="#176f63"
        stroke={selected ? "var(--primary)" : "#0d463f"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />

      {[25, 63].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={23} r={16} fill="#c6c9cd" stroke="#777d84" strokeWidth={1.5} />
          <circle cx={cx} cy={23} r={11} fill="#4b5158" stroke="#a9adb2" strokeWidth={1} />
          <circle cx={cx} cy={23} r={7} fill={triggered ? "#8be9fd" : "#272b30"} />
        </g>
      ))}

      <text x={44} y={43} textAnchor="middle" fill="#d8fff7" fontSize={6.5} fontWeight={700}>
        HC-SR04 · {distanceCm.toFixed(0)} cm
      </text>

      {pins.map((pin) => (
        <g key={`pin-${pin.id}`}>
          <text x={pin.x} y={52} textAnchor="middle" fill="#d8fff7" fontSize={5.5}>
            {pin.name.toUpperCase()}
          </text>
          <PinHitArea
            pin={pin}
            componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(event) => onPinPointerDown(pin.id, event)}
          />
        </g>
      ))}
    </g>
  )
}

export const HcSr04Renderer = memo(HcSr04RendererInner)
