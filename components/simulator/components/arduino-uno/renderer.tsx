"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 460
const H = 360

/** Strip the D/A prefix for authentic silkscreen-style pin labels. */
function shortLabel(name: string): string {
  return name.replace(/^D|^A/, "")
}

function ArduinoUnoRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const onLed = simulation?.pinStates[
    pins.find((p) => p.name === "D13")?.id ?? ""
  ]?.state === "HIGH"
  const rxTxActive = simulation && Object.values(simulation.pinStates).some((s) => s.state === "HIGH")

  const digitalPins = pins.filter((p) => p.type === "digital")
  const analogPins = pins.filter((p) => p.type === "analog")
  const powerPins = pins.filter((p) => p.type === "power" || p.type === "ground")

  return (
    <g data-component-id={component.id}>
      {/* Board substrate */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={8}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#0a4d6e"}
        strokeWidth={selected ? 3 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="none" stroke="#137aa8" strokeWidth={1} />

      {/* Faint copper trace texture for PCB authenticity */}
      <g opacity={0.16} stroke="#5fc4ee" strokeWidth={1} fill="none">
        <path d="M 60 70 h 90 v 26 h 40" />
        <path d="M 300 70 h -50 v 40" />
        <path d="M 320 300 v -40 h 60" />
        <path d="M 140 300 v -30 h -50" />
        <path d="M 60 130 h 20 v 90" />
        <path d="M 400 120 v 60 h -20" />
      </g>

      {/* Mounting holes */}
      {[[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={6} fill="#0a4d6e" stroke="#062f42" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={3} fill="#062f42" />
        </g>
      ))}

      {/* USB-B port (top-left) */}
      <rect x={12} y={-12} width={48} height={30} rx={2} fill="url(#sim-metal)" stroke="#6b7178" filter="url(#sim-drop-shadow-sm)" />
      <rect x={16} y={-12} width={40} height={7} fill="#7c8288" />
      <rect x={19} y={-4} width={34} height={16} rx={1} fill="#3a3d42" stroke="#1c1d20" />
      <rect x={23} y={-1} width={26} height={10} fill="#232527" />
      <circle cx={16} cy={2} r={1.4} fill="#c8ccd0" />
      <circle cx={56} cy={2} r={1.4} fill="#c8ccd0" />

      {/* Barrel jack (bottom-left) */}
      <rect x={8} y={H - 46} width={44} height={36} rx={2} fill="#161616" stroke="#000" filter="url(#sim-drop-shadow-sm)" />
      <circle cx={30} cy={H - 28} r={11} fill="url(#sim-metal)" stroke="#3f3f3f" strokeWidth={1.5} />
      <circle cx={30} cy={H - 28} r={7} fill="#0a0a0a" stroke="#333" />
      <circle cx={30} cy={H - 28} r={2.6} fill="#2a2a2a" />

      {/* Reset button */}
      <rect x={70} y={14} width={22} height={22} rx={2} fill="url(#sim-metal)" stroke="#6b7178" filter="url(#sim-drop-shadow-sm)" />
      <circle cx={81} cy={25} r={7} fill="#d43b3b" stroke="#7a1818" strokeWidth={1} />
      <circle cx={78.5} cy={22.5} r={1.8} fill="#ffffff" opacity={0.45} />
      <text x={81} y={46} textAnchor="middle" fill="#bfe6f5" fontSize={6.5} letterSpacing={0.5}>RESET</text>

      {/* 16MHz crystal oscillator */}
      <rect x={130} y={150} width={26} height={16} rx={3} fill="url(#sim-metal)" stroke="#6b7178" />
      <rect x={130} y={156} width={26} height={4} fill="#8a9096" opacity={0.6} />

      {/* IC (ATmega328P, 28-pin DIP) */}
      <rect x={168} y={140} width={124} height={40} rx={2} fill="#161616" stroke="#000" filter="url(#sim-drop-shadow-sm)" />
      <path d="M 178 140 a 6 6 0 0 0 12 0 Z" fill="#161616" stroke="#000" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={`ic-top-${i}`} x={172 + i * 8.4} y={137} width={3} height={6} fill="#0a0a0a" stroke="#2a2a2a" strokeWidth={0.3} />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={`ic-bot-${i}`} x={172 + i * 8.4} y={177} width={3} height={6} fill="#0a0a0a" stroke="#2a2a2a" strokeWidth={0.3} />
      ))}
      <text x={230} y={163} textAnchor="middle" fill="#8a8a8a" fontSize={6} letterSpacing={0.5}>ATMEGA328P</text>

      {/* ICSP header (2x3 pins) */}
      <g>
        <rect x={302} y={142} width={26} height={16} rx={1} fill="#161616" />
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <circle
              key={`icsp-${row}-${col}`}
              cx={310 + col * 10}
              cy={150 + row * 5}
              r={1.6}
              fill="#e8e8e8"
              stroke="#999"
              strokeWidth={0.4}
            />
          ))
        )}
      </g>

      {/* Logo + wordmark */}
      <text x={W / 2} y={225} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight={700} letterSpacing={1.5} fontStyle="italic">
        ARDUINO
      </text>
      <rect x={W / 2 - 30} y={234} width={60} height={22} rx={11} fill="#ffffff" filter="url(#sim-drop-shadow-sm)" />
      <text x={W / 2} y={250} textAnchor="middle" fill="#0e6690" fontSize={13} fontWeight={800} letterSpacing={0.5}>
        UNO
      </text>
      <text x={W / 2} y={268} textAnchor="middle" fill="#bfe6f5" fontSize={7} opacity={0.7}>
        MADE IN ITALY
      </text>

      {/* TX/RX/ON/L indicator LEDs (small SMD-style rectangles) */}
      <g>
        <rect x={106} y={196} width={8} height={5} rx={1} fill={rxTxActive ? "#ffb020" : "#5a4a20"} stroke="#3a2e10" strokeWidth={0.5} />
        <text x={110} y={212} textAnchor="middle" fill="#bfe6f5" fontSize={7}>TX</text>
        <rect x={106} y={218} width={8} height={5} rx={1} fill={rxTxActive ? "#ffb020" : "#5a4a20"} stroke="#3a2e10" strokeWidth={0.5} />
        <text x={110} y={234} textAnchor="middle" fill="#bfe6f5" fontSize={7}>RX</text>
        <rect x={392} y={196} width={8} height={5} rx={1} fill="#37e05e" stroke="#155c26" strokeWidth={0.5} />
        <text x={396} y={212} textAnchor="middle" fill="#bfe6f5" fontSize={7}>ON</text>
        <circle cx={396} cy={226} r={4.5} fill={onLed ? "#37e05e" : "#0a4d6e"} stroke="#062f42" strokeWidth={1} />
        {onLed && <circle cx={396} cy={226} r={7} fill="none" stroke="#37e05e" strokeWidth={1} opacity={0.5} />}
        <text x={396} y={242} textAnchor="middle" fill="#bfe6f5" fontSize={7}>L</text>
      </g>

      {/* Header strips (sized to bracket each pin cluster) */}
      {[digitalPins.slice(0, 6), digitalPins.slice(6)].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return (
          <g key={`top-strip-${i}`}>
            <rect x={b.min - 12} y={0} width={b.span + 24} height={13} rx={2} fill="#0d0d0d" stroke="#000" strokeWidth={0.5} />
            {cluster.map((p) => (
              <circle key={`${p.name}-hole`} cx={p.x} cy={6} r={1.6} fill="#3a3a3a" stroke="#000" strokeWidth={0.4} />
            ))}
          </g>
        )
      })}
      {[powerPins, analogPins].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return (
          <g key={`bot-strip-${i}`}>
            <rect x={b.min - 12} y={H - 13} width={b.span + 24} height={13} rx={2} fill="#0d0d0d" stroke="#000" strokeWidth={0.5} />
            {cluster.map((p) => (
              <circle key={`${p.name}-hole`} cx={p.x} cy={H - 6} r={1.6} fill="#3a3a3a" stroke="#000" strokeWidth={0.4} />
            ))}
          </g>
        )
      })}

      {/* Header labels */}
      {digitalPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y + 25} textAnchor="middle" fill="#dff3fb" fontSize={9} fontFamily="ui-monospace, monospace">
          {shortLabel(pin.name)}
        </text>
      ))}
      {analogPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y - 17} textAnchor="middle" fill="#dff3fb" fontSize={9} fontFamily="ui-monospace, monospace">
          {shortLabel(pin.name)}
        </text>
      ))}
      {powerPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y - 17} textAnchor="middle" fill="#dff3fb" fontSize={7} fontFamily="ui-monospace, monospace">
          {pin.name.replace(/\d$/, "")}
        </text>
      ))}

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

function clusterBounds(pins: { x: number }[]): { min: number; span: number } | null {
  if (pins.length === 0) return null
  const xs = pins.map((p) => p.x)
  const min = Math.min(...xs)
  const max = Math.max(...xs)
  return { min, span: max - min }
}

export const ArduinoUnoRenderer = memo(ArduinoUnoRendererInner)