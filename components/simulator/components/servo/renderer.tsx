"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const HUB_X = 48
const HUB_Y = 27

// SG90 micro servo, top view. Pins (see definition): gnd (32,92),
// vcc (48,92), signal (64,92) — the three wires end in a black 3-pin
// female connector, brown / red / orange like the real cable.
function ServoRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const angle = typeof simulation?.flags.angle === "number" ? simulation.flags.angle : 90
  const powered = simulation?.flags.powered === true
  const hornRotation = angle - 90
  const edge = selected ? "var(--primary)" : "#143f80"

  return (
    <g data-component-id={component.id}>
      {/* Cable: wires fan from the case into the connector */}
      <g fill="none" strokeLinecap="round" strokeWidth={2.8}>
        <path d="M 43 77 C 43 83 32 80 32 85" stroke="#5e3920" />
        <path d="M 48 77 C 48 83 48 81 48 85" stroke="#d3322a" />
        <path d="M 53 77 C 53 83 64 80 64 85" stroke="#ee8a1d" />
      </g>
      <g fill="none" strokeLinecap="round" strokeWidth={0.8} opacity={0.35}>
        <path d="M 42.4 77 C 42.4 83 31.4 80 31.4 85" stroke="#ffffff" />
        <path d="M 47.4 77 C 47.4 83 47.4 81 47.4 85" stroke="#ffffff" />
        <path d="M 52.4 77 C 52.4 83 63.4 80 63.4 85" stroke="#ffffff" />
      </g>

      {/* Connector housing + sockets */}
      <rect x={23} y={84} width={50} height={8} rx={1.5} fill="url(#sim-plastic-dark)" stroke="#000000" strokeWidth={0.5} />
      {pins.map((pin) => (
        <rect key={`sock-${pin.id}`} x={pin.x - 3.2} y={85.4} width={6.4} height={5.2} rx={0.8} fill="#07080a" stroke="#c9a443" strokeWidth={0.5} />
      ))}
      <g fill="#c8ced8" fontSize={4} fontWeight={700} textAnchor="middle">
        <text x={32} y={97.6}>GND</text>
        <text x={48} y={97.6}>V+</text>
        <text x={64} y={97.6}>SIG</text>
      </g>

      {/* Mounting ears */}
      <g filter="url(#sim-drop-shadow)">
        <rect x={5} y={43} width={86} height={10.5} rx={2.2} fill="url(#sim-servo-blue)" stroke={edge} strokeWidth={selected ? 2.2 : 1} />
      </g>
      {[11.5, 84.5].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={48.2} r={2.7} fill="#0c2a55" stroke="#8ec0ff" strokeWidth={0.5} />
          <circle cx={cx} cy={48.2} r={1.4} fill="#04101f" />
        </g>
      ))}

      {/* Main case */}
      <rect x={19} y={30} width={58} height={48} rx={4} fill="url(#sim-servo-blue)" stroke={edge} strokeWidth={selected ? 2.2 : 1.1} />
      <rect x={20.3} y={31.3} width={55.4} height={1.6} rx={0.8} fill="#ffffff" opacity={0.35} />
      {/* Seam between gear housing and motor case */}
      <line x1={19.6} y1={44} x2={76.4} y2={44} stroke="#0f3a78" strokeWidth={0.8} opacity={0.7} />
      {[24, 72].map((cx) => (
        <circle key={cx} cx={cx} cy={74} r={1.3} fill="#123f80" stroke="#7fb6f8" strokeWidth={0.4} />
      ))}

      {/* Idle gear boss + output boss */}
      <circle cx={63} cy={31} r={6.2} fill="url(#sim-servo-blue)" stroke={edge} strokeWidth={1} />
      <circle cx={HUB_X} cy={HUB_Y} r={13.5} fill="url(#sim-servo-blue)" stroke={edge} strokeWidth={selected ? 2.2 : 1.3} />
      <circle cx={HUB_X} cy={HUB_Y} r={10.2} fill="none" stroke="#0f3a78" strokeWidth={0.8} opacity={0.6} />
      <ellipse cx={HUB_X - 4.5} cy={HUB_Y - 8} rx={5.5} ry={2} fill="#ffffff" opacity={0.3} transform={`rotate(-30 ${HUB_X - 4.5} ${HUB_Y - 8})`} />

      {/* Spline hub + horn, rotating with the servo angle */}
      <g
        transform={`rotate(${hornRotation} ${HUB_X} ${HUB_Y})`}
        style={{ transition: "transform 120ms ease-out" }}
      >
        <path
          d="M 45 22 L 46.2 4.2 Q 48 2.2 49.8 4.2 L 51 22 Z"
          fill="url(#sim-horn)"
          stroke="#aab2bc"
          strokeWidth={0.7}
        />
        <circle cx={HUB_X} cy={7.6} r={1.2} fill="#8b939e" />
        <circle cx={HUB_X} cy={12.2} r={1.1} fill="#8b939e" />
        <circle cx={HUB_X} cy={16.6} r={1} fill="#8b939e" />
        <circle cx={HUB_X} cy={HUB_Y} r={6.4} fill="url(#sim-horn)" stroke="#aab2bc" strokeWidth={0.8} />
        <circle cx={HUB_X} cy={HUB_Y} r={2.5} fill="#9aa3ae" stroke="#6b737d" strokeWidth={0.5} />
        <line x1={HUB_X - 1.6} y1={HUB_Y} x2={HUB_X + 1.6} y2={HUB_Y} stroke="#4f565f" strokeWidth={0.6} />
        <line x1={HUB_X} y1={HUB_Y - 1.6} x2={HUB_X} y2={HUB_Y + 1.6} stroke="#4f565f" strokeWidth={0.6} />
      </g>

      {/* Label sticker + live readout */}
      <rect x={25} y={52} width={46} height={14} rx={2} fill="#eef1f5" stroke="#b7bfc9" strokeWidth={0.5} />
      <text x={HUB_X} y={62.4} textAnchor="middle" fill="#1f2a3a" fontSize={9} fontWeight={800} letterSpacing={0.6}>
        SG90
      </text>
      <text x={HUB_X} y={73.6} textAnchor="middle" fill="#dbeafe" fontSize={6.5} fontWeight={600}>
        {powered ? `${angle}°` : "OFF"}
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

export const ServoRenderer = memo(ServoRendererInner)
