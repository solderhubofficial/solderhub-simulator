"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 56
const H = 78

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

  return (
    <g data-component-id={component.id}>
      {/* Pin legs */}
      {pins.map((pin) => (
        <line key={`leg-${pin.id}`} x1={pin.x} y1={pin.y} x2={pin.x} y2={pin.y - 10} stroke="#9a9a9a" strokeWidth={2} />
      ))}

      {/* Breakout PCB */}
      <rect
        x={2}
        y={30}
        width={W - 4}
        height={H - 32}
        rx={4}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      {[[9, 37], [W - 9, 37]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2} fill="#123c6e" />
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fill="#cfe3ff" fontSize={6.5} fontWeight={600} letterSpacing={0.5}>
        DHT11
      </text>

      {/* White plastic sensor housing (perforated grille) */}
      <rect
        x={4}
        y={0}
        width={W - 8}
        height={34}
        rx={3}
        fill="#f4f2ea"
        stroke="#c8c4b6"
        strokeWidth={1}
        filter="url(#sim-drop-shadow-sm)"
      />
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <rect
            key={`grille-${row}-${col}`}
            x={9 + col * 6.4}
            y={5 + row * 6.5}
            width={4}
            height={4}
            rx={0.5}
            fill="#d8d4c6"
          />
        ))
      )}

      {/* Live readout — not part of the real hardware, but a helpful debug
          label showing the ambient values this sensor is currently
          reporting on its DATA line. */}
      <g opacity={powered ? 1 : 0.35}>
        <rect x={2} y={H + 2} width={W - 4} height={15} rx={3} fill="#0d1117" stroke="#2a2f38" strokeWidth={1} />
        <text x={W / 2} y={H + 12.5} textAnchor="middle" fill="#50FA7B" fontSize={7} fontFamily="ui-monospace, monospace">
          {temperature.toFixed(0)}°C · <tspan fill="#8be9fd">{humidity.toFixed(0)}%RH</tspan>
        </text>
      </g>

      {/* Silkscreen pin labels */}
      <text x={12} y={H - 20} textAnchor="middle" fill="#cfe3ff" fontSize={6.5}>GND</text>
      <text x={28} y={H - 20} textAnchor="middle" fill="#cfe3ff" fontSize={6.5}>OUT</text>
      <text x={44} y={H - 20} textAnchor="middle" fill="#cfe3ff" fontSize={6.5}>VCC</text>

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
