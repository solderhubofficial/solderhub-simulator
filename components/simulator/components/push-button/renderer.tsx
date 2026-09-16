"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

function PushButtonRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const pressed = simulation?.flags.pressed === true || component.metadata.pressed === true

  return (
    <g data-component-id={component.id}>
      {/* Legs — left and right, through-hole style */}
      <line x1={2} y1={25} x2={12} y2={25} stroke="#9a9a9a" strokeWidth={2.5} />
      <line x1={44} y1={25} x2={54} y2={25} stroke="#9a9a9a" strokeWidth={2.5} />

      {/* Body */}
      <rect
        x={12}
        y={7}
        width={32}
        height={36}
        rx={2}
        fill="url(#sim-metal)"
        stroke={selected ? "var(--primary)" : "#5c6469"}
        strokeWidth={selected ? 2 : 1}
        filter="url(#sim-drop-shadow-sm)"
      />
      {/* Corner mounting dots */}
      {[[16, 11], [40, 11], [16, 39], [40, 39]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill="#3a3f43" />
      ))}
      {/* Cap well — a darker ring under the cap gives the button body a
          recessed socket to press into, so the cap reads as sitting proud
          of the housing rather than floating on top of it. */}
      <circle cx={28} cy={25} r={11} fill="#1f2427" opacity={0.4} />

      {/* Cap — genuinely depresses when pressed: it shrinks slightly,
          drops toward the well, darkens, and loses its raised-edge shadow,
          rather than just switching to a different flat colour. */}
      <g
        style={{
          transform: pressed ? "translateY(1px) scale(0.92)" : "translateY(0) scale(1)",
          transformOrigin: "28px 25px",
          transition: "transform 80ms ease-out",
        }}
      >
        {!pressed && <circle cx={28} cy={26.5} r={9} fill="#0e3d1c" opacity={0.3} />}
        <circle
          cx={28}
          cy={25}
          r={9}
          fill={pressed ? "#2b9a46" : "#3ecf5e"}
          stroke="#1f8f3c"
          strokeWidth={1}
        />
        {/* Tactile-switch cross groove moulded into the cap */}
        <line x1={22} y1={25} x2={34} y2={25} stroke="#1f8f3c" strokeWidth={1} opacity={0.5} />
        <line x1={28} y1={19} x2={28} y2={31} stroke="#1f8f3c" strokeWidth={1} opacity={0.5} />
        <ellipse cx={25} cy={22} rx={3} ry={2} fill="#ffffff" opacity={pressed ? 0.2 : 0.4} />
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
