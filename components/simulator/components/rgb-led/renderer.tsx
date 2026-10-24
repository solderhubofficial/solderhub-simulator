"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

// Common-cathode RGB LED in a frosted (diffused) epoxy dome. Pins (see
// definition): red (12,70), cathode (24,70), green (36,70), blue (48,70).
// Three tiny dies sit in a reflector cup and light up independently.
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
  const level = (key: string, on: boolean): number => {
    const value = simulation?.flags[key]
    return on ? (typeof value === "number" ? value : 1) : 0
  }
  const red = Math.round(40 + 215 * level("redLevel", redOn))
  const green = Math.round(40 + 215 * level("greenLevel", greenOn))
  const blue = Math.round(40 + 215 * level("blueLevel", blueOn))
  const mixedColor = `rgb(${red}, ${green}, ${blue})`
  const outline = selected ? "var(--primary)" : "#8b929c"
  const dome = "M 9 41 V 26 A 21 21 0 0 1 51 26 V 41 Z"

  return (
    <g data-component-id={component.id}>
      {isOn && (
        <>
          <circle cx={30} cy={26} r={27} fill={mixedColor} opacity={0.5} filter="url(#sim-glow-blur)" />
          <circle cx={30} cy={24} r={13} fill="#ffffff" opacity={0.3} filter="url(#sim-glow-blur-sm)" />
        </>
      )}

      {/* Leads — the common cathode (2nd) is the longest/widest */}
      {[12, 24, 36, 48].map((x, index) => (
        <LeadV key={x} x={x} y1={46} y2={70} w={index === 1 ? 2.8 : 2} />
      ))}

      {/* Rim flange */}
      <path d="M 7 41 H 53 V 45 Q 53 46.5 51.5 46.5 H 8.5 Q 7 46.5 7 45 Z" fill="#8b929c" />
      <rect x={7} y={41} width={46} height={1.3} fill="#ffffff" opacity={0.35} />

      {/* Internals seen through the frosted epoxy */}
      <g opacity={isOn ? 0.95 : 0.7}>
        {[12, 24, 36, 48].map((x, index) => (
          <rect key={x} x={x - (index === 1 ? 1.3 : 1)} y={34} width={index === 1 ? 2.6 : 2} height={7} fill="url(#sim-lead-v)" />
        ))}
        {/* reflector cup */}
        <path d="M 19 35 L 22.5 28.5 H 37.5 L 41 35 Z" fill="url(#sim-steel)" stroke="#6d7177" strokeWidth={0.4} />
        {/* the three dies */}
        <rect x={23.2} y={26.6} width={3.4} height={2.2} rx={0.4} fill={redOn ? "#ff5a4d" : "#7a3a36"} />
        <rect x={28.3} y={26.6} width={3.4} height={2.2} rx={0.4} fill={greenOn ? "#5dff84" : "#2f6a3d"} />
        <rect x={33.4} y={26.6} width={3.4} height={2.2} rx={0.4} fill={blueOn ? "#6aa8ff" : "#2c4a7e"} />
      </g>

      {/* Frosted dome: milky when idle, tinted by the mixed colour when lit */}
      <path d={dome} fill="url(#sim-led-frost)" fillOpacity={isOn ? 0.55 : 0.86} stroke={outline} strokeWidth={selected ? 1.8 : 0.9} />
      {isOn && <path d={dome} fill={mixedColor} opacity={0.82} />}
      {isOn && <ellipse cx={30} cy={24} rx={12} ry={9} fill="#ffffff" opacity={0.28} filter="url(#sim-glow-blur-sm)" />}
      <path d={dome} fill="url(#sim-cyl-shade-v)" opacity={0.5} />
      <path d={dome} fill="url(#sim-dome-sheen)" />
      <ellipse cx={20} cy={16} rx={5} ry={8.5} fill="#ffffff" opacity={isOn ? 0.4 : 0.5} />
      <ellipse cx={39} cy={12} rx={2} ry={1.4} fill="#ffffff" opacity={0.6} />

      {/* Pin labels, tucked beside each lead */}
      {[
        { x: 12, t: "R", c: "#e5473d" },
        { x: 24, t: "−", c: "#8892b0" },
        { x: 36, t: "G", c: "#2fa84e" },
        { x: 48, t: "B", c: "#3a82e0" },
      ].map((l) => (
        <text key={l.t} x={l.x + 3} y={60} fill={l.c} fontSize={6} fontWeight={700}>
          {l.t}
        </text>
      ))}

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
