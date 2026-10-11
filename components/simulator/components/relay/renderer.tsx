"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadH } from "@/components/simulator/components/base/leads"

// Single-channel relay module. Pins (see definition): coil- (-6,62) and
// coil+ (-6,82) on the left header; NO (124,42), COM (124,62), NC (124,82)
// on the right screw terminals. A blue SRD-style relay cube, optocoupler,
// driver transistor, flyback diode, two status LEDs and a 3-way terminal block.
const TERMINAL_Y = { NO: 42, COM: 62, NC: 82 } as const

function RelayRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const isEnergized = simulation?.flags.isEnergized === true
  const rightPins = pins.filter((p) => p.name === "NO" || p.name === "COM" || p.name === "NC")
  const closedY = isEnergized ? TERMINAL_Y.NO : TERMINAL_Y.NC
  const openY = isEnergized ? TERMINAL_Y.NC : TERMINAL_Y.NO
  const edge = selected ? "var(--primary)" : "#7a1818"

  return (
    <g data-component-id={component.id}>
      {/* Header + terminal leads sit under the board edge */}
      <LeadH x1={-6} x2={6} y={62} w={2.4} kind="gold" />
      <LeadH x1={-6} x2={6} y={82} w={2.4} kind="gold" />
      {rightPins.map((pin) => (
        <LeadH key={`lead-${pin.id}`} x1={112} x2={124} y={pin.y} w={2.4} kind="gold" />
      ))}

      {/* PCB */}
      <rect
        x={0}
        y={0}
        width={118}
        height={96}
        rx={4}
        fill="url(#sim-pcb-red)"
        stroke={edge}
        strokeWidth={selected ? 2.5 : 1.3}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={3} y={3} width={112} height={90} rx={3} fill="none" stroke="#f0a0a0" strokeWidth={0.6} opacity={0.55} />
      {[[7, 7], [111, 7], [7, 89], [111, 89]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={2.6} fill="#d8b24c" />
          <circle cx={cx} cy={cy} r={1.6} fill="#4a0d0d" />
        </g>
      ))}

      {/* Left header block */}
      <rect x={0.5} y={54} width={9} height={36} rx={1} fill="url(#sim-plastic-dark)" />
      {[62, 82].map((y) => (
        <rect key={y} x={2.2} y={y - 2.6} width={5.6} height={5.2} rx={0.6} fill="#050607" />
      ))}
      <g fill="#fbe3e3" fontSize={6.6} fontWeight={700}>
        <text x={12} y={64.4}>GND</text>
        <text x={12} y={84.4}>IN</text>
      </g>

      {/* Status LEDs */}
      <g>
        <circle cx={16} cy={19} r={5} fill={isEnergized ? "#ff4a3d" : "#000000"} opacity={isEnergized ? 0.55 : 0} filter="url(#sim-glow-blur-sm)" />
        <rect x={13} y={17.2} width={6} height={3.6} rx={0.9} fill={isEnergized ? "#ff6a5c" : "#7a2323"} stroke="#4a0d0d" strokeWidth={0.5} />
        <rect x={13.6} y={17.6} width={2.4} height={1} rx={0.5} fill="#ffffff" opacity={isEnergized ? 0.8 : 0.35} />
        <text x={16} y={13.5} textAnchor="middle" fill="#fbe3e3" fontSize={5}>PWR</text>

        <circle cx={16} cy={76} r={5} fill={isEnergized ? "#37e05e" : "#000000"} opacity={isEnergized ? 0.55 : 0} filter="url(#sim-glow-blur-sm)" />
        <rect x={13} y={74.2} width={6} height={3.6} rx={0.9} fill={isEnergized ? "#5cf07e" : "#2d5a38"} stroke="#4a0d0d" strokeWidth={0.5} />
        <rect x={13.6} y={74.6} width={2.4} height={1} rx={0.5} fill="#ffffff" opacity={isEnergized ? 0.8 : 0.3} />
        <text x={20.4} y={77} fill="#fbe3e3" fontSize={4.2}>LED1</text>
      </g>

      {/* Optocoupler (DIP-4), transistor, diode, resistors */}
      <g>
        <rect x={13} y={36} width={11} height={9} rx={1} fill="#17191c" stroke="#000000" strokeWidth={0.4} />
        <circle cx={15.2} cy={38.2} r={0.7} fill="#4b5058" />
        {[14.6, 22.4].map((x) => (
          <g key={x}>
            <rect x={x - 0.6} y={34.8} width={1.2} height={1.4} fill="#c9ccd1" />
            <rect x={x - 0.6} y={44.8} width={1.2} height={1.4} fill="#c9ccd1" />
          </g>
        ))}
        <path d="M 26 50 H 32 L 33.2 52 L 32 54 H 26 Z" fill="#16181b" />
        <rect x={26} y={55.5} width={6.6} height={3} rx={0.4} fill="#16181b" />
        <rect x={26} y={55.5} width={1.3} height={3} fill="#c9ccd1" />
        <rect x={31.3} y={55.5} width={1.3} height={3} fill="#c9ccd1" />
        <rect x={13} y={66} width={9} height={3.2} rx={0.5} fill="#1d1f23" />
        <rect x={13} y={66} width={1.4} height={3.2} fill="#c9ccd1" />
        <rect x={20.6} y={66} width={1.4} height={3.2} fill="#c9ccd1" />
      </g>

      {/* Relay cube — top face with the usual printed ratings */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={32} y={18} width={44} height={60} rx={3} fill="url(#sim-relay-blue)" stroke="#173a78" strokeWidth={1} />
      </g>
      <rect x={33.4} y={19.4} width={41.2} height={2} rx={1} fill="#ffffff" opacity={0.3} />
      <rect x={35.5} y={24} width={37} height={50} rx={1.5} fill="none" stroke="#173a78" strokeWidth={0.6} opacity={0.5} />
      <g fill="#f4f8ff" textAnchor="middle" fontWeight={700}>
        <text x={54} y={33.5} fontSize={4.8}>SRD-05VDC-SL-C</text>
        <text x={54} y={41} fontSize={4} fontWeight={600} opacity={0.9}>10A 250VAC · 125VAC</text>
        <text x={54} y={47} fontSize={4} fontWeight={600} opacity={0.9}>10A 30VDC · 28VDC</text>
        <text x={54} y={64.5} fontSize={10} letterSpacing={0.3}>Relay</text>
      </g>
      <g stroke="#f4f8ff" strokeWidth={0.5} opacity={0.55}>
        <line x1={37.5} y1={52} x2={70.5} y2={52} />
        <line x1={37.5} y1={70} x2={70.5} y2={70} />
      </g>

      {/* 3-way screw terminal block */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={94} y={30} width={22} height={62} rx={2} fill="url(#sim-terminal-blue)" stroke="#173f7a" strokeWidth={1} />
      </g>
      {[42, 62].map((y) => (
        <line key={y} x1={94.6} y1={y + 10} x2={115.4} y2={y + 10} stroke="#173f7a" strokeWidth={0.8} />
      ))}
      {[42, 62, 82].map((y, i) => (
        <g key={y}>
          {/* wire entry on the outer edge */}
          <rect x={109.5} y={y - 4.5} width={6} height={9} rx={0.8} fill="#0b1b36" />
          {/* slotted screw head */}
          <circle cx={102} cy={y} r={5.2} fill="url(#sim-steel)" stroke="#5b6066" strokeWidth={0.7} />
          <circle cx={102} cy={y} r={3.6} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.6} />
          <line x1={99} y1={y} x2={105} y2={y} stroke="#3f444a" strokeWidth={1.2} strokeLinecap="round" transform={`rotate(${30 + i * 47} 102 ${y})`} />
        </g>
      ))}
      <g fill="#fbe3e3" fontSize={5.4} fontWeight={700} textAnchor="end">
        <text x={88} y={43.8}>NO</text>
        <text x={88} y={63.8}>COM</text>
        <text x={88} y={83.8}>NC</text>
      </g>

      {/* Contact path — shows which throw COM is currently made to. The
          closed route glows; the open route is drawn as a dim ghost. */}
      <path d={`M 94 62 H 91 V ${openY} H 93`} fill="none" stroke="#7a1818" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} strokeDasharray="1.6 2" />
      <path
        d={`M 94 62 H 91 V ${closedY} H 93`}
        fill="none"
        stroke={isEnergized ? "#ffb02e" : "#f4f4f4"}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "stroke 120ms ease-out" }}
      />

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

export const RelayRenderer = memo(RelayRendererInner)
