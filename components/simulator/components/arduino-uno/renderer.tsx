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
      <defs>
        {/* Board gradients */}
        <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a4d2a" />
          <stop offset="100%" stopColor="#0f331c" />
        </linearGradient>
        <linearGradient id="pcbHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a6a3a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0a1f12" stopOpacity="0.6" />
        </linearGradient>

        {/* Metal gradients */}
        <linearGradient id="metalGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f7e7b0" />
          <stop offset="30%" stopColor="#e8c85a" />
          <stop offset="70%" stopColor="#b8942a" />
          <stop offset="100%" stopColor="#7a5e1a" />
        </linearGradient>
        <linearGradient id="metalSilver" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f0f0f0" />
          <stop offset="40%" stopColor="#cccccc" />
          <stop offset="100%" stopColor="#888888" />
        </linearGradient>
        <linearGradient id="metalDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a4a4a" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>

        {/* Plastic header gradients */}
        <linearGradient id="headerPlastic" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>

        {/* IC body */}
        <linearGradient id="icBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>

        {/* Drop shadows */}
        <filter id="shadowLarge" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.5" />
        </filter>
        <filter id="shadowSmall" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="shadowTiny" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
        </filter>

        {/* Glow for LEDs */}
        <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ===== BOARD SUBSTRATE ===== */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={8}
        fill="url(#pcbGrad)"
        stroke={selected ? "var(--primary)" : "#0a4d6e"}
        strokeWidth={selected ? 3 : 1.5}
        filter="url(#shadowLarge)"
      />
      <rect x={4} y={4} width={W - 8} height={H - 8} rx={6} fill="url(#pcbHighlight)" />

      {/* PCB copper trace texture (fine lines with curves) */}
      <g opacity={0.25} stroke="#c8a84a" strokeWidth={1.2} fill="none">
        <path d="M 60 70 h 90 v 26 h 40" />
        <path d="M 300 70 h -50 v 40" />
        <path d="M 320 300 v -40 h 60" />
        <path d="M 140 300 v -30 h -50" />
        <path d="M 60 130 h 20 v 90" />
        <path d="M 400 120 v 60 h -20" />
        <path d="M 180 90 h 30 v 30" />
        <path d="M 280 280 v -40 h -40" />
        {/* Additional decorative traces */}
        <path d="M 90 200 h 40 v 20 h 30" />
        <path d="M 370 180 v 40 h -20" />
        <circle cx={200} cy={250} r={25} strokeWidth="0.8" />
        <circle cx={350} cy={80} r={18} strokeWidth="0.8" />
      </g>

      {/* Small copper pads and vias */}
      <g fill="#b8942a" opacity={0.4}>
        <circle cx={70} cy={100} r={2.5} />
        <circle cx={140} cy={160} r={2.5} />
        <circle cx={210} cy={130} r={2.5} />
        <circle cx={380} cy={220} r={2.5} />
        <circle cx={290} cy={310} r={2.5} />
        <circle cx={410} cy={280} r={2.5} />
      </g>

      {/* ===== MOUNTING HOLES ===== */}
      {[[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={7} fill="#0f331c" stroke="#1a4d2a" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={4} fill="#0a1f12" />
          <circle cx={cx} cy={cy} r={2.5} fill="#000" />
        </g>
      ))}

      {/* ===== USB-B PORT (top-left) ===== */}
      <g transform="translate(12, -12)">
        <rect width={48} height={30} rx={3} fill="url(#metalDark)" stroke="#333" strokeWidth={0.5} filter="url(#shadowSmall)" />
        <rect x={2} y={2} width={44} height={7} fill="url(#metalSilver)" />
        <rect x={5} y={10} width={38} height={14} rx={1} fill="#222" stroke="#444" />
        <rect x={9} y={13} width={30} height={8} fill="#111" />
        <circle cx={4} cy={18} r={2} fill="url(#metalSilver)" />
        <circle cx={44} cy={18} r={2} fill="url(#metalSilver)" />
        {/* USB logo */}
        <path d="M 24 5 l -4 8 h 8 z" fill="#666" stroke="none" />
      </g>

      {/* ===== BARREL JACK (bottom-left) ===== */}
      <g transform="translate(8, 314)">
        <rect width={44} height={36} rx={3} fill="#1a1a1a" stroke="#000" filter="url(#shadowSmall)" />
        <circle cx={22} cy={18} r={13} fill="url(#metalSilver)" stroke="#555" strokeWidth={1.5} />
        <circle cx={22} cy={18} r={9} fill="#0a0a0a" stroke="#333" strokeWidth={1} />
        <circle cx={22} cy={18} r={4} fill="#222" />
        <circle cx={22} cy={18} r={1.5} fill="#555" />
        <rect x={18} y={0} width={8} height={6} fill="#333" />
      </g>

      {/* ===== RESET BUTTON ===== */}
      <g transform="translate(70, 14)">
        <rect width={22} height={22} rx={2} fill="url(#metalDark)" stroke="#555" filter="url(#shadowSmall)" />
        <rect x={2} y={2} width={18} height={18} rx={1.5} fill="#d43b3b" stroke="#7a1818" strokeWidth={0.8} />
        <circle cx={7} cy={7} r={2.5} fill="#fff" opacity="0.3" />
        <text x={11} y={34} textAnchor="middle" fill="#bfe6f5" fontSize={6.5} letterSpacing={0.5}>RESET</text>
      </g>

      {/* ===== 16MHz CRYSTAL OSCILLATOR ===== */}
      <g transform="translate(130, 150)">
        <rect width={26} height={16} rx={2} fill="url(#metalSilver)" stroke="#888" filter="url(#shadowTiny)" />
        <rect x={2} y={2} width={22} height={12} rx={1} fill="url(#metalGold)" opacity="0.6" />
        <text x={13} y={11} textAnchor="middle" fill="#333" fontSize={5} fontWeight="bold">16M</text>
        <rect x={0} y={4} width={3} height={8} fill="#aaa" />
        <rect x={23} y={4} width={3} height={8} fill="#aaa" />
      </g>

      {/* ===== ATmega328P IC (28-pin DIP) ===== */}
      <g transform="translate(168, 138)">
        <rect width={124} height={44} rx={2} fill="url(#icBody)" stroke="#222" filter="url(#shadowSmall)" />
        {/* IC notch */}
        <path d="M 8 6 a 8 8 0 0 0 16 0 Z" fill="#1a1a1a" stroke="#333" />
        {/* Pins top */}
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={`ic-top-${i}`} x={4 + i * 8.4} y={-4} width={3.5} height={8} fill="url(#metalSilver)" stroke="#666" strokeWidth="0.3" />
        ))}
        {/* Pins bottom */}
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={`ic-bot-${i}`} x={4 + i * 8.4} y={40} width={3.5} height={8} fill="url(#metalSilver)" stroke="#666" strokeWidth="0.3" />
        ))}
        {/* Text on IC */}
        <text x={62} y={24} textAnchor="middle" fill="#7a7a7a" fontSize={8} fontWeight="bold" letterSpacing={0.3}>ATMEGA328P</text>
        <text x={62} y={34} textAnchor="middle" fill="#5a5a5a" fontSize={5}>ARDUINO</text>
        {/* Small dot near pin 1 */}
        <circle cx={10} cy={10} r={1.2} fill="#666" />
      </g>

      {/* ===== ICSP HEADER (2x3 pins) ===== */}
      <g transform="translate(302, 142)">
        <rect width={26} height={16} rx={1} fill="#1a1a1a" stroke="#333" />
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <rect
              key={`icsp-${row}-${col}`}
              x={4 + col * 10}
              y={4 + row * 5.2}
              width={2.5}
              height={2.5}
              rx={0.5}
              fill="url(#metalGold)"
              stroke="#aa8830"
              strokeWidth="0.3"
            />
          ))
        )}
      </g>

      {/* ===== LOGO AND WORDMARK ===== */}
      <g transform="translate(230, 225)">
        <text x={0} y={0} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700} letterSpacing={2} fontStyle="italic">
          ARDUINO
        </text>
        <rect x={-36} y={8} width={72} height={22} rx={11} fill="#fff" filter="url(#shadowSmall)" />
        <text x={0} y={23} textAnchor="middle" fill="#0e6690" fontSize={13} fontWeight={800} letterSpacing={0.5}>
          UNO
        </text>
        <text x={0} y={43} textAnchor="middle" fill="#bfe6f5" fontSize={7} opacity={0.8}>
          MADE IN ITALY
        </text>
      </g>

      {/* ===== TX/RX/ON/L LEDs ===== */}
      <g>
        {/* TX LED */}
        <rect x={106} y={194} width={10} height={6} rx={1} fill={rxTxActive ? "#f5a623" : "#5a4a20"} stroke="#3a2e10" strokeWidth="0.5" filter="url(#shadowTiny)" />
        {rxTxActive && <rect x={106} y={194} width={10} height={6} rx={1} fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.5" filter="url(#ledGlow)" />}
        <text x={111} y={212} textAnchor="middle" fill="#bfe6f5" fontSize={7}>TX</text>

        {/* RX LED */}
        <rect x={106} y={218} width={10} height={6} rx={1} fill={rxTxActive ? "#f5a623" : "#5a4a20"} stroke="#3a2e10" strokeWidth="0.5" filter="url(#shadowTiny)" />
        {rxTxActive && <rect x={106} y={218} width={10} height={6} rx={1} fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.5" filter="url(#ledGlow)" />}
        <text x={111} y={236} textAnchor="middle" fill="#bfe6f5" fontSize={7}>RX</text>

        {/* ON LED */}
        <rect x={392} y={194} width={10} height={6} rx={1} fill="#37e05e" stroke="#155c26" strokeWidth="0.5" filter="url(#shadowTiny)" />
        <rect x={392} y={194} width={10} height={6} rx={1} fill="none" stroke="#37e05e" strokeWidth="1" opacity="0.4" filter="url(#ledGlow)" />
        <text x={397} y={212} textAnchor="middle" fill="#bfe6f5" fontSize={7}>ON</text>

        {/* L LED (round) */}
        <circle cx={397} cy={226} r={5} fill={onLed ? "#37e05e" : "#0a4d6e"} stroke="#062f42" strokeWidth="1" filter="url(#shadowTiny)" />
        {onLed && <circle cx={397} cy={226} r={8} fill="none" stroke="#37e05e" strokeWidth="1" opacity="0.5" filter="url(#ledGlow)" />}
        <text x={397} y={244} textAnchor="middle" fill="#bfe6f5" fontSize={7}>L</text>
      </g>

      {/* ===== HEADER STRIPS (plastic bases with gold pins) ===== */}
      {/* Top digital headers (two strips) */}
      {[digitalPins.slice(0, 6), digitalPins.slice(6)].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return (
          <g key={`top-strip-${i}`} transform={`translate(${b.min - 12}, 0)`}>
            <rect width={b.span + 24} height={14} rx={1.5} fill="url(#headerPlastic)" stroke="#111" strokeWidth="0.5" filter="url(#shadowSmall)" />
            {cluster.map((p) => (
              <rect
                key={`${p.name}-hole`}
                x={p.x - (b.min - 12) - 1.5}
                y={1}
                width={3}
                height={3}
                rx={0.5}
                fill="url(#metalGold)"
                stroke="#aa8830"
                strokeWidth="0.3"
              />
            ))}
          </g>
        )
      })}

      {/* Bottom headers (power + analog) */}
      {[powerPins, analogPins].map((cluster, i) => {
        const b = clusterBounds(cluster)
        if (!b) return null
        return (
          <g key={`bot-strip-${i}`} transform={`translate(${b.min - 12}, ${H - 14})`}>
            <rect width={b.span + 24} height={14} rx={1.5} fill="url(#headerPlastic)" stroke="#111" strokeWidth="0.5" filter="url(#shadowSmall)" />
            {cluster.map((p) => (
              <rect
                key={`${p.name}-hole`}
                x={p.x - (b.min - 12) - 1.5}
                y={1}
                width={3}
                height={3}
                rx={0.5}
                fill="url(#metalGold)"
                stroke="#aa8830"
                strokeWidth="0.3"
              />
            ))}
          </g>
        )
      })}

      {/* ===== SILKSCREEN PIN LABELS ===== */}
      {digitalPins.map((pin) => (
        <text
          key={`${pin.id}-lbl`}
          x={pin.x}
          y={pin.y + 25}
          textAnchor="middle"
          fill="#dff3fb"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          opacity={0.9}
        >
          {shortLabel(pin.name)}
        </text>
      ))}
      {analogPins.map((pin) => (
        <text
          key={`${pin.id}-lbl`}
          x={pin.x}
          y={pin.y - 17}
          textAnchor="middle"
          fill="#dff3fb"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          opacity={0.9}
        >
          {shortLabel(pin.name)}
        </text>
      ))}
      {powerPins.map((pin) => (
        <text
          key={`${pin.id}-lbl`}
          x={pin.x}
          y={pin.y - 17}
          textAnchor="middle"
          fill="#dff3fb"
          fontSize={7}
          fontFamily="ui-monospace, monospace"
          opacity={0.8}
        >
          {pin.name.replace(/\d$/, "")}
        </text>
      ))}

      {/* ===== INTERACTIVE PIN HIT AREAS ===== */}
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