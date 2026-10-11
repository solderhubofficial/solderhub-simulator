"use client"

import { memo } from "react"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"
import type { ComponentRendererProps } from "@/types/simulator"

const CAN_Y = 22
const CAN_R = 15

// HC-SR04 ultrasonic ranger. Pins (see definition): vcc (14,56),
// trig (34,56), echo (54,56), gnd (74,56). Two silver transducer cans
// (T = transmit, R = receive) on a blue board, 4-pin header below.
function HcSr04RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const distanceCm =
    typeof simulation?.flags.distanceCm === "number"
      ? simulation.flags.distanceCm
      : typeof component.metadata.distanceCm === "number"
        ? component.metadata.distanceCm
        : 100
  const triggered = simulation?.flags.triggered === true
  const edge = selected ? "var(--primary)" : "#12306b"

  return (
    <g data-component-id={component.id}>
      <text x={44} y={-3} textAnchor="middle" fill="#8892b0" fontSize={7.5}>
        HC-SR04 · {distanceCm.toFixed(0)} cm
      </text>

      {/* Header pins below the board */}
      {pins.map((pin) => (
        <LeadV key={`leg-${pin.id}`} x={pin.x} y1={44} y2={pin.y} w={2.4} kind="gold" />
      ))}

      {/* PCB */}
      <rect
        x={1}
        y={1}
        width={86}
        height={45}
        rx={3}
        fill="url(#sim-pcb-royal)"
        stroke={edge}
        strokeWidth={selected ? 2.5 : 1.2}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={2.3} y={2.3} width={83.4} height={42.4} rx={2.2} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.2} />
      {[[5.2, 5.2], [82.8, 5.2], [5.2, 41.8], [82.8, 41.8]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={1.9} fill="#d8b24c" />
          <circle cx={cx} cy={cy} r={1.1} fill="#0a1e47" />
        </g>
      ))}

      {/* Header housing straddling the lower edge */}
      <rect x={6} y={41.5} width={76} height={5.5} rx={0.8} fill="url(#sim-plastic-dark)" />
      {pins.map((pin) => (
        <rect key={`hole-${pin.id}`} x={pin.x - 3.4} y={42.5} width={6.8} height={3.5} rx={0.5} fill="#040506" />
      ))}

      {/* Silkscreen */}
      <text x={44} y={26} textAnchor="middle" fill="#e4edff" fontSize={4.6} fontWeight={700} letterSpacing={0.4} transform="rotate(-90 44 22)">
        HC-SR04
      </text>
      <g fill="#e4edff" fontSize={5} fontWeight={800} textAnchor="middle">
        <text x={25} y={41}>T</text>
        <text x={63} y={41}>R</text>
      </g>

      {/* Transducer cans */}
      {[25, 63].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={CAN_Y + 1.2} r={CAN_R} fill="#000000" opacity={0.3} filter="url(#sim-glow-blur-sm)" />
          <circle cx={cx} cy={CAN_Y} r={CAN_R} fill="url(#sim-steel)" stroke="#6b7077" strokeWidth={1} />
          <circle cx={cx} cy={CAN_Y} r={CAN_R - 1.6} fill="none" stroke="#ffffff" strokeWidth={0.6} opacity={0.6} />
          {/* Mesh grille */}
          <circle cx={cx} cy={CAN_Y} r={11} fill="#23272d" stroke="#8d9299" strokeWidth={0.8} />
          <circle cx={cx} cy={CAN_Y} r={8.2} fill="none" stroke="#454b53" strokeWidth={0.6} />
          <circle cx={cx} cy={CAN_Y} r={5.6} fill="none" stroke="#454b53" strokeWidth={0.6} />
          {/* Diaphragm */}
          <circle cx={cx} cy={CAN_Y} r={3.6} fill={triggered ? "#8be9fd" : "#0f1114"} stroke="#5a6068" strokeWidth={0.5} />
          {triggered && <circle cx={cx} cy={CAN_Y} r={6} fill="#8be9fd" opacity={0.4} filter="url(#sim-glow-blur-sm)" />}
          <ellipse cx={cx - 5} cy={CAN_Y - 7.2} rx={4.2} ry={1.8} fill="#ffffff" opacity={0.18} transform={`rotate(-35 ${cx - 5} ${CAN_Y - 7.2})`} />
        </g>
      ))}

      {/* Header pin names, set beside each lead */}
      {pins.map((pin) => (
        <text key={`lbl-${pin.id}`} x={pin.x + 3.4} y={53} fill="#8892b0" fontSize={5} fontWeight={600}>
          {pin.name.toUpperCase()}
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

export const HcSr04Renderer = memo(HcSr04RendererInner)
