"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

const W = 56
const H = 78

// DHT11 temperature / humidity module. Pins (see definition): GND (12,76),
// DATA (28,76), VCC (44,76). The real sensor is the blue slotted block; it
// sits on a small green breakout board with a pull-up resistor and a 3-pin
// header.
function Dht11RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation ? simulation.flags.powered === true : true
  const temperature = typeof simulation?.flags.temperature === "number"
    ? simulation.flags.temperature
    : typeof component.metadata.temperature === "number"
      ? component.metadata.temperature
      : 24
  const humidity = typeof simulation?.flags.humidity === "number"
    ? simulation.flags.humidity
    : typeof component.metadata.humidity === "number"
      ? component.metadata.humidity
      : 50
  const isDht22 = component.type === "dht22"
  const edge = selected ? "var(--primary)" : "#0a3c24"

  return (
    <g data-component-id={component.id}>
      {/* Header pins below the board */}
      {pins.map((pin) => (
        <LeadV key={`leg-${pin.id}`} x={pin.x} y1={66} y2={pin.y} w={2.4} kind="gold" />
      ))}

      {/* Breakout PCB */}
      <rect
        x={2}
        y={32}
        width={W - 4}
        height={36}
        rx={3.5}
        fill="url(#sim-pcb-green)"
        stroke={edge}
        strokeWidth={selected ? 2.5 : 1.2}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={3.3} y={33.3} width={W - 6.6} height={33.4} rx={2.6} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.18} />
      {[[7.5, 63], [W - 7.5, 63]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={2} fill="#d8b24c" />
          <circle cx={cx} cy={cy} r={1.2} fill="#06281a" />
        </g>
      ))}

      {/* SMD pull-up resistor + capacitor */}
      <g>
        <rect x={37} y={47} width={9} height={3.4} rx={0.4} fill="#16181b" />
        <rect x={37} y={47} width={1.6} height={3.4} fill="#c9ccd1" />
        <rect x={44.4} y={47} width={1.6} height={3.4} fill="#c9ccd1" />
        <rect x={10} y={47} width={6.5} height={3.4} rx={0.4} fill="#9b7a3a" />
        <rect x={10} y={47} width={1.4} height={3.4} fill="#c9ccd1" />
        <rect x={15.1} y={47} width={1.4} height={3.4} fill="#c9ccd1" />
      </g>

      {/* Silkscreen */}
      <text x={W / 2} y={55.4} textAnchor="middle" fill="#dff5e7" fontSize={5.6} fontWeight={700} letterSpacing={0.5}>
        {component.type === "dht22" ? "DHT22" : "DHT11"}
      </text>
      <g fill="#dff5e7" fontSize={5} fontWeight={600} textAnchor="middle">
        <text x={12} y={64.4}>GND</text>
        <text x={28} y={64.4}>OUT</text>
        <text x={44} y={64.4}>VCC</text>
      </g>

      {/* Blue sensor housing with its ventilation slots */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={6} y={1} width={W - 12} height={40} rx={2.6} fill={isDht22 ? "#f3f4f6" : "url(#sim-dht-blue)"} stroke={isDht22 ? "#9ca3af" : "#16427e"} strokeWidth={1} />
      </g>
      <rect x={7.2} y={2.2} width={W - 14.4} height={1.6} rx={0.8} fill="#ffffff" opacity={0.4} />
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <g key={`slot-${row}-${col}`}>
            <rect x={10.6 + col * 7.2} y={6 + row * 5.6} width={4.6} height={3.2} rx={0.7} fill={isDht22 ? "#cbd5e1" : "#12386f"} />
            <rect x={10.6 + col * 7.2} y={6 + row * 5.6 + 2.4} width={4.6} height={0.8} rx={0.4} fill={isDht22 ? "#ffffff" : "#7db4f5"} opacity={0.5} />
          </g>
        ))
      )}
      {/* Pin-1 mark on the housing */}
      <circle cx={9.6} cy={38} r={0.9} fill={isDht22 ? "#64748b" : "#bcd9ff"} opacity={0.7} />

      {/* Live readout — not part of the real hardware, but a helpful debug
          label showing the ambient values this sensor is currently
          reporting on its DATA line. */}
      <g opacity={powered ? 1 : 0.35}>
        <rect x={2} y={H + 2} width={W - 4} height={15} rx={3} fill="#0d1117" stroke="#2a2f38" strokeWidth={1} />
        <text x={W / 2} y={H + 12.5} textAnchor="middle" fill="#50FA7B" fontSize={7} fontFamily="ui-monospace, monospace">
          {temperature.toFixed(0)}°C · <tspan fill="#8be9fd">{humidity.toFixed(0)}%RH</tspan>
        </text>
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

export const Dht11Renderer = memo(Dht11RendererInner)
