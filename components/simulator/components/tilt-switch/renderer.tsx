"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadH } from "@/components/simulator/components/base/leads"

const AXIS_Y = 34
const BALL_R = 5.2
const BALL_Y = AXIS_Y + 11 - BALL_R - 1

// Rolling-ball tilt switch, drawn as a cut-away glass tube. Pins (see
// definition): pin1 (0,34), pin2 (72,34).
// The left lead runs inside the tube along the top to the far end, where its
// post sits next to the right lead's post. At rest the ball sits at the left
// (circuit open); tilted, it rolls onto both posts and bridges them (closed).
function TiltSwitchRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const tilted = simulation?.flags.tilted === true || component.metadata.tilted === true
  const ballX = tilted ? 47 : 27
  const edge = selected ? "var(--primary)" : "#6b7a86"

  return (
    <g data-component-id={component.id}>
      <LeadH x1={0} x2={11} y={AXIS_Y} w={2.4} />
      <LeadH x1={61} x2={72} y={AXIS_Y} w={2.4} />

      {/* Glass tube */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={18} y={22.5} width={36} height={23} rx={11.5} fill="#dbe9f2" fillOpacity={0.28} stroke={edge} strokeWidth={selected ? 2 : 1} />
      </g>

      {/* Internals */}
      <g>
        {/* left conductor runs along the top of the tube to its far post */}
        <rect x={19} y={26.2} width={25.6} height={1.3} rx={0.6} fill="#c98a3a" />
        <rect x={43.8} y={26.2} width={1.4} height={9.8} rx={0.6} fill="url(#sim-lead-v)" />
        {/* right lead's post */}
        <rect x={49.2} y={31} width={1.4} height={5} rx={0.6} fill="url(#sim-lead-v)" />
        <rect x={49} y={34} width={5} height={1.3} rx={0.6} fill="#c98a3a" />
        {/* contact glow while the ball bridges the posts */}
        {tilted && (
          <>
            <circle cx={47} cy={BALL_Y - 1} r={6.5} fill="#36e06a" opacity={0.5} filter="url(#sim-glow-blur-sm)" />
            <rect x={43.8} y={26.2} width={1.4} height={9.8} rx={0.6} fill="#36e06a" opacity={0.7} />
            <rect x={49.2} y={31} width={1.4} height={5} rx={0.6} fill="#36e06a" opacity={0.7} />
          </>
        )}
        {/* rolling ball */}
        <g style={{ transition: "transform 140ms ease-out", transform: `translateX(${ballX}px)` }}>
          <circle cx={0} cy={BALL_Y} r={BALL_R} fill="url(#sim-ball)" stroke="#3c4248" strokeWidth={0.7} />
        </g>
      </g>

      {/* Glass reflections */}
      <rect x={21} y={24.4} width={30} height={1.8} rx={0.9} fill="#ffffff" opacity={0.55} />
      <rect x={23} y={42.2} width={26} height={1.1} rx={0.55} fill="#ffffff" opacity={0.3} />

      {/* Brass end ferrules */}
      <g>
        <rect x={9} y={24} width={11} height={20} rx={3} fill="url(#sim-brass)" stroke="#7a5e16" strokeWidth={0.8} />
        <rect x={52} y={24} width={11} height={20} rx={3} fill="url(#sim-brass)" stroke="#7a5e16" strokeWidth={0.8} />
        <rect x={10.4} y={25.3} width={8} height={1.4} rx={0.7} fill="#ffffff" opacity={0.45} />
        <rect x={53.4} y={25.3} width={8} height={1.4} rx={0.7} fill="#ffffff" opacity={0.45} />
      </g>

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

export const TiltSwitchRenderer = memo(TiltSwitchRendererInner)
