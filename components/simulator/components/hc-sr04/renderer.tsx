"use client"

import { memo } from "react"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import type { ComponentRendererProps } from "@/types/simulator"

const ART_WIDTH = 108
const ART_HEIGHT = 60
const TRANSDUCERS = [{ x: 21.55, y: 24 }, { x: 86.64, y: 24 }]

function HcSr04RendererInner({
  component, pins, selected, simulation, onPinClick, onPinPointerDown,
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
      {selected && (
        <rect x={-2} y={-2} width={ART_WIDTH + 4} height={ART_HEIGHT + 4}
          rx={2} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href="/third-party/velxio/hc-sr04.svg" x={0} y={0}
        width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
      <text x={ART_WIDTH / 2} y={-3} textAnchor="middle" fill="#8892b0" fontSize={6.5}>
        {distanceCm.toFixed(0)} cm
      </text>
      {triggered && TRANSDUCERS.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={5}
          fill="#8be9fd" fillOpacity={0.25} pointerEvents="none" />
      ))}
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(event) => onPinPointerDown(pin.id, event)}
          radius={2.3} />
      ))}
    </g>
  )
}

export const HcSr04Renderer = memo(HcSr04RendererInner)
