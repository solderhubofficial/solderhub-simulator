"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const BOARD = { x: 7, y: 6, width: 106, height: 162 }
const mountingHoles = [
  [19, 21],
  [101, 21],
  [19, 158],
  [101, 158],
] as const

function Mq3RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const detected = simulation?.flags.detected === true || component.metadata.detected === true
  const analogValue =
    typeof simulation?.flags.analogValue === "number"
      ? simulation.flags.analogValue
      : typeof component.metadata.analogValue === "number"
        ? component.metadata.analogValue
        : 320

  return (
    <g data-component-id={component.id}>
      {/* Reference-matched blue MQ-3 breakout board */}
      <rect
        x={BOARD.x}
        y={BOARD.y}
        width={BOARD.width}
        height={BOARD.height}
        rx={10}
        fill="#07518a"
        stroke={selected ? "var(--primary)" : "#062b49"}
        strokeWidth={selected ? 2.2 : 1.6}
        filter="url(#sim-drop-shadow)"
      />
      <path d="M 12 22 Q 12 11 23 11 H 97 Q 108 11 108 22 V 151 Q 108 163 97 163 H 23 Q 12 163 12 151 Z" fill="none" stroke="#1680b6" strokeWidth={1} opacity={0.55} />
      {mountingHoles.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={7.5} fill="#d9e3e8" stroke="#071c2d" strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={4.7} fill="#0b1824" stroke="#8da4b1" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={2.6} fill="#102f46" />
        </g>
      ))}

      {/* Large orange sensing can with tightly woven metallic mesh */}
      <circle cx={60} cy={57} r={43.5} fill="#061d2c" opacity={0.45} />
      <circle cx={60} cy={54.5} r={42.5} fill="#f45112" stroke="#9e2e0b" strokeWidth={1.6} />
      <circle cx={60} cy={53.5} r={38.8} fill="#ff6a1b" stroke="#ff9b45" strokeWidth={1.1} />
      <circle cx={60} cy={53.5} r={29.5} fill="#555b5e" stroke="#181f23" strokeWidth={1.4} />
      <circle cx={60} cy={53.5} r={28.2} fill="#9ca3a5" stroke="#d2d5d5" strokeWidth={0.65} />
      <defs>
        <pattern id={`mq3-mesh-${component.id}`} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#8c9293" />
          <path d="M -0.5 0.5 L 0.5 -0.5 M 0 3 L 3 0 M 2.5 3.5 L 3.5 2.5" stroke="#d9dddd" strokeWidth="0.85" />
          <path d="M 0 0 L 3 3 M -1 2 L 1 4 M 2 -1 L 4 1" stroke="#454b4d" strokeWidth="0.75" />
        </pattern>
      </defs>
      <circle cx={60} cy={53.5} r={27.7} fill={`url(#mq3-mesh-${component.id})`} stroke="#353b3e" strokeWidth={0.9} />
      <path d="M 31 32 Q 40 17 60 16" fill="none" stroke="#ffb16d" strokeWidth={1.4} opacity={0.8} />

      {/* Small comparator and indicator components at lower right, as in the reference */}
      <circle cx={99} cy={109} r={2.4} fill="#e9e5d4" stroke="#343c40" strokeWidth={0.8} />
      <circle cx={83} cy={126} r={2.6} fill="#f4e4bd" stroke="#3d4448" strokeWidth={0.8} />
      <rect x={89} y={119} width={13.5} height={16} rx={0.5} fill="#151a1d" stroke="#070b0d" strokeWidth={0.8} />
      {Array.from({ length: 4 }).map((_, i) => (
        <g key={`ic-leg-${i}`} stroke="#c6c8c5" strokeWidth={1}>
          <line x1={90 + i * 3.5} y1={117} x2={90 + i * 3.5} y2={119} />
          <line x1={90 + i * 3.5} y1={135} x2={90 + i * 3.5} y2={138} />
        </g>
      ))}
      <path d="M 92 122 H 100 M 92 125 H 99 M 92 128 H 100" stroke="#555d60" strokeWidth={0.7} />
      {detected && <circle cx={99} cy={109} r={4.5} fill="#fb923c" opacity={0.28} />}

      {/* Labels sit directly above the four correctly ordered header pins */}
      {pins.map((pin) => (
        <g key={pin.id}>
          <text
            x={pin.x}
            y={149}
            textAnchor="middle"
            fill="#f0f4ff"
            fontSize={7.2}
            fontWeight={700}
            fontFamily="Arial, sans-serif"
          >
            {pin.name}
          </text>
          <line x1={pin.x} y1={154} x2={pin.x} y2={pin.y} stroke="#aab5bc" strokeWidth={2.4} />
          <line x1={pin.x - 0.7} y1={155} x2={pin.x - 0.7} y2={pin.y - 1} stroke="#f6f7f7" strokeWidth={0.55} opacity={0.75} />
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

export const Mq3Renderer = memo(Mq3RendererInner)
