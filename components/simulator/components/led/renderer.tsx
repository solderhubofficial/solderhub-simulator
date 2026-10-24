"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"
import { LED_COLORS, resolveLedColorKey } from "@/lib/simulator/led-colors"

// 5 mm through-hole LED. Pins (see definition): anode (13,68), cathode (27,60).
// The dome is translucent epoxy, so the real lead frame — the big cathode
// "anvil" cup and the thin anode post with its bond wire — is drawn first and
// the tinted dome is laid over it.
function LedRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const colorKey = resolveLedColorKey(component.metadata.color)
  const colors = LED_COLORS[colorKey]
  const isOn = simulation?.flags.isOn === true
  const level = typeof simulation?.flags.brightness === "number" ? simulation.flags.brightness : 1
  const outline = selected ? "var(--primary)" : colors.dark
  const dome = "M 9.5 40 V 22 A 10.5 10.5 0 0 1 30.5 22 V 40 Z"

  return (
    <g data-component-id={component.id} data-led-on={isOn ? "true" : "false"}>
      {/* Light halo — behind everything so it blooms around the dome */}
      {isOn && (
        <>
          <circle cx={20} cy={26} r={21} fill={colors.glow} opacity={0.45 * level} filter="url(#sim-glow-blur)" />
          <circle cx={20} cy={24} r={11} fill="#ffffff" opacity={0.35 * level} filter="url(#sim-glow-blur-sm)" />
        </>
      )}

      {/* Leads — anode (long) / cathode (short) */}
      <LeadV x={13} y1={44} y2={68} w={2} />
      <LeadV x={27} y1={44} y2={60} w={2} />

      {/* Rim flange with the flat cut on the cathode side */}
      <path
        d="M 8 40 H 32 V 44 Q 32 45.5 30.5 45.5 H 9.5 Q 8 45.5 8 44 Z"
        fill={colors.dark}
        opacity={0.92}
      />
      <path d="M 28.8 40 H 32 V 44 Q 32 45.5 30.5 45.5 H 28.8 Z" fill="#000000" opacity={0.28} />
      <rect x={8} y={40} width={24} height={1.2} fill="#ffffff" opacity={0.28} />

      {/* Lead frame visible through the epoxy */}
      <g opacity={isOn ? 0.95 : 0.82}>
        {/* cathode post + anvil cup */}
        <rect x={25.9} y={29} width={2.2} height={11.5} fill="url(#sim-lead-v)" />
        <path d="M 19 24.2 H 29 L 27.6 29 H 20.4 Z" fill="url(#sim-steel)" stroke="#6d7177" strokeWidth={0.4} />
        {/* anode post */}
        <rect x={11.9} y={31} width={2.2} height={9.5} fill="url(#sim-lead-v)" />
        {/* die + bond wire */}
        <rect x={21.6} y={22.9} width={3.6} height={1.4} rx={0.3} fill={isOn ? "#ffffff" : colors.glow} />
        <path d="M 13 31 C 13 25 18 22 22 22.4" fill="none" stroke="#e3bf55" strokeWidth={0.6} />
      </g>

      {/* Epoxy dome */}
      <path
        d={dome}
        fill={`url(#sim-led-${colorKey}${isOn ? "-on" : ""})`}
        fillOpacity={isOn ? 0.45 + 0.47 * level : 0.8}
        stroke={outline}
        strokeWidth={selected ? 1.6 : 0.8}
      />
      {/* Cylinder shading across the straight walls + dome sheen */}
      <path d={dome} fill="url(#sim-cyl-shade-v)" opacity={0.55} />
      <path d={dome} fill="url(#sim-dome-sheen)" />

      {/* Specular highlights */}
      <ellipse cx={14.8} cy={19.5} rx={2.6} ry={6.2} fill="#ffffff" opacity={isOn ? 0.65 : 0.5} />
      <ellipse cx={24.5} cy={15} rx={1.3} ry={1} fill="#ffffff" opacity={0.7} />
      <rect x={27.6} y={26} width={1.3} height={12} rx={0.65} fill="#ffffff" opacity={0.22} />

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
