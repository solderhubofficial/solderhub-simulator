"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function channel(value: boolean, on: number, off: number): number {
  return value ? on : off
}

function RgbLedRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const redOn = simulation?.flags.redOn === true
  const greenOn = simulation?.flags.greenOn === true
  const blueOn = simulation?.flags.blueOn === true
  const isOn = redOn || greenOn || blueOn
  const red = channel(redOn, 255, 78)
  const green = channel(greenOn, 255, 78)
  const blue = channel(blueOn, 255, 78)
  const mixedColor = `rgb(${red}, ${green}, ${blue})`
  const strokeColor = selected ? "var(--primary)" : "#5b6070"

  return (
    <g data-component-id={component.id}>
      {[12, 24, 36, 48].map((x, index) => (
        <line
          key={x}
          x1={x}
          y1={45}
          x2={x}
          y2={70}
          stroke={index === 1 ? "#777f88" : "#a8adb4"}
          strokeWidth={index === 1 ? 2.7 : 2}
        />
      ))}

      <rect x={7} y={41} width={46} height={6} rx={2} fill="#69707a" />
      <path
        d="M 7 41 L 7 24 A 23 23 0 0 1 53 24 L 53 41 Z"
        fill={mixedColor}
        stroke={strokeColor}
        strokeWidth={selected ? 2 : 1.2}
        opacity={isOn ? 0.96 : 0.68}
        style={isOn ? { filter: `drop-shadow(0 0 9px ${mixedColor})` } : undefined}
      />
      <ellipse cx={21} cy={18} rx={7} ry={10} fill="#ffffff" opacity={isOn ? 0.48 : 0.25} />
      <text x={30} y={59} textAnchor="middle" fill="#8c929a" fontSize={6} fontWeight={700}>
        R C G B
      </text>

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

export const RgbLedRenderer = memo(RgbLedRendererInner)
