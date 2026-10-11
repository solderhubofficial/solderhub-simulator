"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadH } from "@/components/simulator/components/base/leads"

// Tactile push switch. Pins (see definition): pin1 (2,25), pin2 (54,25).
// Black moulded base, stainless cover plate riveted at the corners, and a
// round plunger cap that visibly sinks when pressed.
function PushButtonRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const pressed = simulation?.flags.pressed === true || component.metadata.pressed === true
  const edge = selected ? "var(--primary)" : "#15171a"

  return (
    <g data-component-id={component.id}>
      {/* Terminals */}
      <LeadH x1={2} x2={13} y={25} w={3} />
      <LeadH x1={43} x2={54} y={25} w={3} />

      <g filter="url(#sim-drop-shadow-sm)">
        {/* Moulded base */}
        <rect x={10} y={7} width={36} height={36} rx={4.5} fill="url(#sim-plastic-dark)" stroke={edge} strokeWidth={selected ? 2 : 0.8} />
      </g>

      {/* Stainless cover plate */}
      <rect x={12.2} y={9.2} width={31.6} height={31.6} rx={3.2} fill="url(#sim-steel)" stroke="#6e737a" strokeWidth={0.6} />
      <rect x={12.9} y={9.9} width={30.2} height={1} rx={0.5} fill="#ffffff" opacity={0.55} />

      {/* Corner rivets */}
      {[[15.6, 12.6], [40.4, 12.6], [15.6, 37.4], [40.4, 37.4]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={1.7} fill="#7c8188" />
          <circle cx={cx - 0.3} cy={cy - 0.3} r={1.1} fill="#d9dce0" />
        </g>
      ))}

      {/* Plunger well cut into the plate */}
      <circle cx={28} cy={25} r={11.4} fill="#0c0d0f" />
      <circle cx={28} cy={25} r={11.4} fill="none" stroke="#9aa0a7" strokeWidth={0.7} />

      {/* Cap — sinks, shrinks and darkens when pressed */}
      <g
        style={{
          transform: pressed ? "translateY(0.8px) scale(0.93)" : "translateY(0) scale(1)",
          transformOrigin: "28px 25px",
          transition: "transform 80ms ease-out",
        }}
      >
        {!pressed && <ellipse cx={28} cy={27.2} rx={9.6} ry={9.2} fill="#000000" opacity={0.35} />}
        <circle
          cx={28}
          cy={25}
          r={9.4}
          fill={pressed ? "url(#sim-btn-cap-pressed)" : "url(#sim-btn-cap)"}
          stroke="#145a28"
          strokeWidth={0.8}
        />
        <circle cx={28} cy={25} r={6.2} fill="none" stroke="#ffffff" strokeWidth={0.5} opacity={pressed ? 0.12 : 0.22} />
        <ellipse cx={24.8} cy={21.2} rx={3.6} ry={2.2} fill="#ffffff" opacity={pressed ? 0.18 : 0.5} transform="rotate(-25 24.8 21.2)" />
      </g>

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

export const PushButtonRenderer = memo(PushButtonRendererInner)
