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

      {/* Mounting holes */}
      {[[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#0a4d6e" stroke="#062f42" strokeWidth={1} />
      ))}

      {/* USB port (top-left) */}
      <rect x={14} y={-10} width={44} height={26} rx={2} fill="url(#sim-metal)" stroke="#8b9198" />
      <rect x={20} y={-10} width={32} height={10} fill="#9aa0a6" />

      {/* Barrel jack (bottom-left) */}
      <rect x={10} y={H - 44} width={40} height={34} rx={2} fill="#1a1a1a" stroke="#000" />
      <circle cx={30} cy={H - 27} r={9} fill="#0a0a0a" stroke="#333" />

      {/* Reset button */}
      <rect x={70} y={16} width={20} height={20} rx={2} fill="url(#sim-metal)" stroke="#8b9198" />
      <circle cx={80} cy={26} r={6} fill="#d43b3b" stroke="#8f1f1f" />
      <circle cx={78} cy={24} r={1.6} fill="#ffffff" opacity={0.4} />

      {/* IC (ATmega328P DIP) */}
      <rect x={168} y={140} width={124} height={40} rx={2} fill="#1c1c1c" stroke="#000" />
      <circle cx={178} cy={150} r={2.5} fill="#555" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={`ic-top-${i}`} x={178 + i * 16} y={138} width={3} height={6} fill="#111" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={`ic-bot-${i}`} x={178 + i * 16} y={176} width={3} height={6} fill="#111" />
      ))}

      {/* ICSP header (2x3 dots) */}
      <g>
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <circle
              key={`icsp-${row}-${col}`}
              cx={310 + col * 10}
              cy={150 + row * 10}
              r={2}
              fill="#e8e8e8"
              stroke="#999"
            />
          ))
        )}
      </g>

      {/* Logo + wordmark */}
      <text x={W / 2} y={230} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight={700} letterSpacing={1}>
        ARDUINO
      </text>
      <rect x={W / 2 - 28} y={238} width={56} height={20} rx={10} fill="#ffffff" />
      <text x={W / 2} y={253} textAnchor="middle" fill="#0e6690" fontSize={12} fontWeight={800}>
        UNO
      </text>

      {/* TX/RX/ON/L indicator LEDs */}
      <circle cx={110} cy={200} r={3} fill="#e0a000" />
      <text x={110} y={214} textAnchor="middle" fill="#bfe6f5" fontSize={7}>TX</text>
      <circle cx={110} cy={222} r={3} fill="#e0a000" />
      <text x={110} y={236} textAnchor="middle" fill="#bfe6f5" fontSize={7}>RX</text>
      <circle cx={396} cy={200} r={3} fill="#37e05e" />
      <text x={396} y={214} textAnchor="middle" fill="#bfe6f5" fontSize={7}>ON</text>
      <circle cx={396} cy={228} r={4} fill={onLed ? "#37e05e" : "#0a4d6e"} stroke="#062f42" />
      <text x={396} y={244} textAnchor="middle" fill="#bfe6f5" fontSize={7}>L</text>

      {/* Header strips (sized to bracket each pin cluster) */}
      {[digitalPins.slice(0, 6), digitalPins.slice(6)].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return <rect key={`top-strip-${i}`} x={b.min - 12} y={0} width={b.span + 24} height={12} rx={2} fill="#111" />
      })}
      {[powerPins, analogPins].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return <rect key={`bot-strip-${i}`} x={b.min - 12} y={H - 12} width={b.span + 24} height={12} rx={2} fill="#111" />
      })}

      {/* Header labels */}
      {digitalPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y + 24} textAnchor="middle" fill="#dff3fb" fontSize={9}>
          {shortLabel(pin.name)}
        </text>
      ))}
      {analogPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y - 16} textAnchor="middle" fill="#dff3fb" fontSize={9}>
          {shortLabel(pin.name)}
        </text>
      ))}
      {powerPins.map((pin) => (
        <text key={`${pin.id}-lbl`} x={pin.x} y={pin.y - 16} textAnchor="middle" fill="#dff3fb" fontSize={7}>
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
