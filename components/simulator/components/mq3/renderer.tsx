"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 120
const H = 120

const mountingHoles = [
  [12, 20],
  [108, 20],
  [12, 91],
  [108, 91],
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
      {/* Blue breakout PCB and mounting hardware */}
      <rect
        x={4}
        y={12}
        width={112}
        height={89}
        rx={5}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      <path d="M 17 27 H 23 V 20 H 32 M 67 20 H 73 V 27 H 78 M 19 72 H 25 V 80 H 35 M 62 84 H 70 V 77 H 76" fill="none" stroke="#4aa3b5" strokeWidth={1} opacity={0.65} />
      {mountingHoles.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={4.2} fill="#dce7eb" stroke="#153e5e" strokeWidth={1.4} />
          <circle cx={cx} cy={cy} r={2.1} fill="#0a192c" />
        </g>
      ))}

      {/* Metal mesh can and orange insulating base of the MQ-3 sensing element */}
      <ellipse cx={44} cy={47} rx={26} ry={27} fill="#9a3412" opacity={0.45} />
      <circle cx={44} cy={43} r={24} fill="#f97316" stroke="#9a3412" strokeWidth={2} filter="url(#sim-drop-shadow-sm)" />
      <circle cx={44} cy={41} r={20.5} fill="url(#sim-metal)" stroke="#4b5563" strokeWidth={1.7} />
      <circle cx={44} cy={41} r={16.5} fill="#858b90" stroke="#e5e7eb" strokeWidth={1} />
      <circle cx={44} cy={41} r={13.8} fill="#5d646a" stroke="#353b40" strokeWidth={1} />
      {Array.from({ length: 7 }).flatMap((_, row) =>
        Array.from({ length: 7 }).map((__, col) => {
          const dx = (col - 3) * 3.8
          const dy = (row - 3) * 3.8
          if (dx * dx + dy * dy > 12.7 * 12.7) return null
          return (
            <circle
              key={`mesh-${row}-${col}`}
              cx={44 + dx}
              cy={41 + dy}
              r={1.15}
              fill={(row + col) % 2 === 0 ? "#c9cdd0" : "#3b4247"}
              stroke="#454b50"
              strokeWidth={0.35}
            />
          )
        }),
      )}
      <path d="M 31 28 Q 44 22 57 28" fill="none" stroke="#f8fafc" strokeWidth={1.2} opacity={0.65} />

      {/* Trimmer potentiometer used to set the digital comparator threshold */}
      <rect x={76} y={22} width={27} height={24} rx={3} fill="#087f8c" stroke="#07545f" strokeWidth={1.2} />
      <rect x={80} y={25} width={19} height={18} rx={2} fill="#0e7490" stroke="#53b6c3" strokeWidth={0.8} />
      <circle cx={89.5} cy={34} r={7} fill="url(#sim-metal)" stroke="#58636b" strokeWidth={1} />
      <circle cx={89.5} cy={34} r={3.8} fill="#30363b" stroke="#d1d5db" strokeWidth={0.7} />
      <path d="M 87 34 H 92 M 89.5 31.5 V 36.5" stroke="#e5e7eb" strokeWidth={0.9} />
      <text x={89.5} y={19} textAnchor="middle" fill="#dbeafe" fontSize={5.5} fontWeight={700}>THRESHOLD</text>

      {/* LM393 comparator and discrete parts */}
      <rect x={72} y={53} width={31} height={17} rx={2} fill="#111827" stroke="#020617" strokeWidth={1} />
      {Array.from({ length: 4 }).map((_, index) => (
        <g key={`ic-pin-${index}`}>
          <path d={`M ${75 + index * 7.2} 53 V 50 M ${75 + index * 7.2} 70 V 73`} stroke="#cbd5e1" strokeWidth={1.2} />
        </g>
      ))}
      <path d="M 78 58 H 96 M 78 62 H 91" stroke="#64748b" strokeWidth={0.8} />
      <text x={87.5} y={67} textAnchor="middle" fill="#e5e7eb" fontSize={4.5} fontWeight={700}>LM393</text>

      {/* Power and comparator status LEDs */}
      <g>
        <rect x={74} y={77} width={10} height={5} rx={1} fill="#111827" stroke="#020617" strokeWidth={0.6} />
        <rect x={76} y={78} width={2} height={3} fill="#d1d5db" />
        <rect x={80} y={78} width={2} height={3} fill="#d1d5db" />
        <circle cx={91} cy={79.5} r={3} fill={detected ? "#fb923c" : "#334155"} stroke="#f8fafc" strokeWidth={0.7} />
        <circle cx={101} cy={79.5} r={3} fill="#22c55e" stroke="#dcfce7" strokeWidth={0.7} opacity={0.9} />
        {detected && <circle cx={91} cy={79.5} r={5.2} fill="#fb923c" opacity={0.18} />}
      </g>

      <text x={44} y={77} textAnchor="middle" fill="#dbeafe" fontSize={6.2} fontWeight={800} letterSpacing={0.8}>MQ-3</text>
      <text x={44} y={86} textAnchor="middle" fill="#cfe3ff" fontSize={5.3} fontWeight={600}>ALCOHOL / GAS</text>
      <text x={44} y={95} textAnchor="middle" fill={detected ? "#fdba74" : "#93c5fd"} fontSize={5.2} fontFamily="ui-monospace, monospace">
        AO {Math.max(0, Math.min(1023, Math.round(analogValue)))}
      </text>

      {/* Header leads, labels, and large hit targets for reliable wiring */}
      {pins.map((pin) => (
        <g key={pin.id}>
          <line x1={pin.x} y1={100} x2={pin.x} y2={pin.y} stroke="#b8c0c8" strokeWidth={2.4} />
          <line x1={pin.x - 1} y1={101} x2={pin.x - 1} y2={pin.y - 1} stroke="#f8fafc" strokeWidth={0.55} opacity={0.8} />
          <text x={pin.x} y={99} textAnchor="middle" fill="#eff6ff" fontSize={5.8} fontWeight={700}>{pin.name}</text>
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
