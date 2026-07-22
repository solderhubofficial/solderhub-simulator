"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const COLOR_MAP: Record<string, { body: string; dark: string; glow: string }> = {
  red: { body: "#f0483e", dark: "#a82820", glow: "#ff6b5c" },
  green: { body: "#3ecf5e", dark: "#1f8f3c", glow: "#6bf58a" },
  blue: { body: "#3e8ecf", dark: "#1f5f8f", glow: "#6bb8f5" },
  yellow: { body: "#f0cf3e", dark: "#a89020", glow: "#ffe66b" },
}

function LedRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const colorKey = typeof component.metadata.color === "string" ? component.metadata.color : "red"
  const colors = COLOR_MAP[colorKey] ?? COLOR_MAP.red
  const isOn = simulation?.flags.isOn === true
  const domeFill = isOn ? colors.glow : colors.body

  return (
    <g data-component-id={component.id}>
      {/* Leads — anode (left, longer) / cathode (right, shorter) */}
      <line x1={13} y1={44} x2={13} y2={68} stroke="#9a9a9a" strokeWidth={2} />
      <line x1={27} y1={44} x2={27} y2={60} stroke="#9a9a9a" strokeWidth={2} />

      {/* Base flange */}
      <rect x={9} y={40} width={22} height={5} rx={1.5} fill={colors.dark} />

      {/* Dome bulb */}
      <path
        d="M 9 40 L 9 22 A 11 11 0 0 1 31 22 L 31 40 Z"
        fill={domeFill}
        stroke={selected ? "var(--primary)" : colors.dark}
        strokeWidth={selected ? 2 : 1}
        style={isOn ? { filter: `drop-shadow(0 0 7px ${colors.glow})` } : undefined}
      />
      {/* Flat notch marking cathode side */}
      <path d="M 27 38 L 31 38 L 31 30" fill="none" stroke={colors.dark} strokeWidth={1} opacity={0.6} />
      {/* Glossy highlight */}
      <ellipse cx={16} cy={20} rx={4} ry={7} fill="#ffffff" opacity={isOn ? 0.55 : 0.35} />

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

export const LedRenderer = memo(LedRendererInner)
