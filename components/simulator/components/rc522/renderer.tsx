"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// RC522 / MFRC522 13.56 MHz RFID reader module. Pins (see definition) sit on
// an 8-way header along the bottom edge at y=163, pitch 20.
// Drawn like the real blue module: solder-mask board, a rectangular copper
// antenna spiral, a leg-less QFN32 MFRC522, the 27.12 MHz crystal, SMD
// passives and a black 2.54 mm pin header with gold pins.

/** Rectangular antenna spiral, 5 turns, 6.5 unit pitch. */
const ANTENNA_PATH =
  "M 20 16 L 160 16 L 160 96 L 20 96 L 20 22.5 L 26.5 22.5 L 153.5 22.5 L 153.5 89.5 L 26.5 89.5 L 26.5 29 L 33 29 L 147 29 L 147 83 L 33 83 L 33 35.5 L 39.5 35.5 L 140.5 35.5 L 140.5 76.5 L 39.5 76.5 L 39.5 42 L 46 42 L 134 42 L 134 70 L 46 70 L 46 48.5"

const HEADER_Y = 155
const PIN_Y = 163

/** 0603-style SMD part: pale/dark body with two tinned end caps. */
function Smd({ x, y, w = 8, h = 4.4, body = "#2a2620" }: { x: number; y: number; w?: number; h?: number; body?: string }) {
  const cap = Math.max(1.4, w * 0.2)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={0.5} fill={body} stroke="#000000" strokeOpacity={0.45} strokeWidth={0.35} />
      <rect x={x} y={y} width={cap} height={h} rx={0.5} fill="url(#sim-steel)" />
      <rect x={x + w - cap} y={y} width={cap} height={h} rx={0.5} fill="url(#sim-steel)" />
      <rect x={x + cap} y={y + 0.4} width={w - cap * 2} height={0.7} fill="#ffffff" opacity={0.18} />
    </g>
  )
}

function Rc522RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const cardPresent = component.metadata.cardPresent === true
  const edge = selected ? "var(--primary)" : "#06335f"

  return (
    <g data-component-id={component.id}>
      {/* Solder-mask board */}
      <rect
        x={4}
        y={4}
        width={172}
        height={164}
        rx={5}
        fill="url(#sim-pcb-rc522)"
        stroke={edge}
        strokeWidth={selected ? 2.6 : 1.4}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={7.5} y={7.5} width={165} height={157} rx={3.4} fill="none" stroke="#5fb0f0" strokeWidth={0.6} opacity={0.4} />
      <rect x={6} y={5.2} width={168} height={2.4} rx={1.2} fill="#ffffff" opacity={0.14} />

      {/* Antenna field glow when a tag is in range */}
      {cardPresent && (
        <rect x={20} y={16} width={140} height={80} rx={4} fill="none" stroke="#9be7ff" strokeWidth={8} opacity={0.5} filter="url(#sim-glow-blur-sm)" />
      )}

      {/* 13.56 MHz antenna — gold-plated copper spiral with a lit top edge */}
      <path d={ANTENNA_PATH} fill="none" stroke="#000000" strokeOpacity={0.3} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" transform="translate(0.6 0.9)" />
      <path d={ANTENNA_PATH} fill="none" stroke="#a8691f" strokeWidth={3.3} strokeLinejoin="round" strokeLinecap="round" />
      <path d={ANTENNA_PATH} fill="none" stroke="#e7b152" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      <path d={ANTENNA_PATH} fill="none" stroke="#fbe29a" strokeWidth={0.8} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} transform="translate(-0.5 -0.5)" />

      {/* Antenna feed traces down to the matching network */}
      <g fill="none" stroke="#e7b152" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 20 96 V 101 H 30" />
        <path d="M 72 108 H 82" />
        <path d="M 110 108 H 117" />
        <path d="M 110 120 H 117" />
      </g>

      {/* RF matching network: SMD resistors, caps and a ferrite chip */}
      <Smd x={28} y={104} w={9} body="#d8cfae" />
      <Smd x={41} y={104} w={9} body="#d8cfae" />
      <Smd x={54} y={104} w={9} body="#cbbd96" />
      <Smd x={28} y={118} w={9} body="#2a2620" />
      <Smd x={41} y={118} w={9} body="#8a6a3a" />
      <Smd x={54} y={118} w={9} body="#2a2620" />
      <Smd x={28} y={131} w={9} body="#d8cfae" />
      <Smd x={41} y={131} w={9} body="#2a2620" />
      <Smd x={64} y={134} w={9} body="#d8cfae" />

      {/* MFRC522 — HVQFN32, no protruding legs, pin-1 dot, laser marking */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={80} y={103} width={30} height={30} rx={1.6} fill="#1a1d21" stroke="#050607" strokeWidth={0.8} />
      </g>
      <rect x={80.6} y={103.6} width={28.8} height={28.8} rx={1.2} fill="none" stroke="#4c545c" strokeWidth={0.4} opacity={0.8} />
      <rect x={81.5} y={104.3} width={27} height={1.1} rx={0.55} fill="#ffffff" opacity={0.14} />
      {Array.from({ length: 8 }, (_, i) => {
        const o = 83.6 + i * 3
        return (
          <g key={i} fill="#d6b45a">
            <rect x={o} y={102.4} width={1.5} height={1.1} />
            <rect x={o} y={132.5} width={1.5} height={1.1} />
            <rect x={79.4} y={o + 19.6} width={1.1} height={1.5} />
            <rect x={109.5} y={o + 19.6} width={1.1} height={1.5} />
          </g>
        )
      })}
      <circle cx={84.3} cy={107.4} r={1.2} fill="#0a0b0d" stroke="#59616a" strokeWidth={0.35} />
      <text x={96} y={116.6} textAnchor="middle" fontSize={4.6} fontWeight={700} fill="#cfd5db" letterSpacing={0.2}>MFRC</text>
      <text x={96} y={121.8} textAnchor="middle" fontSize={4.6} fontWeight={700} fill="#cfd5db" letterSpacing={0.2}>522</text>
      <text x={96} y={127.8} textAnchor="middle" fontSize={3.4} fill="#8d97a0">NXP · 2116</text>

      {/* 27.12 MHz crystal — SMD metal can */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={117} y={104} width={16} height={9.4} rx={1.4} fill="url(#sim-steel)" stroke="#6a7077" strokeWidth={0.5} />
      </g>
      <rect x={118.2} y={104.8} width={13.6} height={1.1} rx={0.55} fill="#ffffff" opacity={0.65} />
      <text x={125} y={110.9} textAnchor="middle" fontSize={3.4} fontWeight={700} fill="#424950">27.12</text>
      <rect x={115.6} y={106} width={1.6} height={5.4} fill="#cfd2d6" />
      <rect x={132.8} y={106} width={1.6} height={5.4} fill="#cfd2d6" />

      {/* Decoupling caps beside the crystal and a tantalum bulk cap */}
      <Smd x={117} y={119} w={8} body="#8a6a3a" />
      <Smd x={128} y={119} w={8} body="#2a2620" />
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={117} y={128} width={15} height={8} rx={1} fill="#c7862c" stroke="#7e4f10" strokeWidth={0.5} />
      </g>
      <rect x={117} y={128} width={3.2} height={8} rx={0.8} fill="#2a1c0a" opacity={0.78} />
      <rect x={118.4} y={129} width={12.2} height={1} rx={0.5} fill="#ffffff" opacity={0.3} />

      {/* Status LED (lit while powered) */}
      <circle cx={150} cy={116} r={6} fill="#3cff7f" opacity={powered ? 0.6 : 0} filter="url(#sim-glow-blur-sm)" />
      <rect x={146.4} y={114} width={7.2} height={4.2} rx={0.9} fill={powered ? "#5cff9a" : "#264d36"} stroke="#031a0d" strokeWidth={0.5} />
      <rect x={147.2} y={114.6} width={3} height={1.1} rx={0.55} fill="#ffffff" opacity={powered ? 0.85 : 0.3} />
      <Smd x={146.4} y={123} w={7.2} body="#2a2620" />

      {/* Silkscreen */}
      <g fill="#eaf4ff" fontWeight={700}>
        <text x={30} y={145.4} fontSize={6.2} letterSpacing={0.4}>RFID-RC522</text>
        <text x={150} y={133.4} textAnchor="middle" fontSize={4.4}>PWR</text>
      </g>
      <g fill="none" stroke="#eaf4ff" strokeWidth={0.6} opacity={0.75}>
        <path d="M 12 12 H 18 M 12 12 V 18" />
        <path d="M 168 12 H 162 M 168 12 V 18" />
      </g>

      {/* Pin names, one above each header pin */}
      <g fill="#eaf4ff" fontSize={5.2} fontWeight={700} textAnchor="middle">
        {pins.map((pin) => (
          <text key={`label-${pin.id}`} x={pin.x} y={152.6}>
            {pin.name}
          </text>
        ))}
      </g>

      {/* 8-way 2.54 mm male header: black housing + gold square pins */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={8} y={HEADER_Y} width={164} height={12.6} rx={1} fill="url(#sim-plastic-dark)" stroke="#000000" strokeWidth={0.6} />
      </g>
      <rect x={9} y={HEADER_Y + 0.8} width={162} height={1.1} rx={0.55} fill="#ffffff" opacity={0.2} />
      {[28, 48, 68, 88, 108, 128, 148].map((x) => (
        <line key={x} x1={x} y1={HEADER_Y + 1} x2={x} y2={HEADER_Y + 11.6} stroke="#000000" strokeOpacity={0.55} strokeWidth={0.6} />
      ))}
      {pins.map((pin) => (
        <g key={pin.id}>
          <rect x={pin.x - 1.9} y={PIN_Y - 1.9} width={3.8} height={3.8} rx={0.5} fill="url(#sim-gold-v)" stroke="#7e5f14" strokeWidth={0.3} />
          <rect x={pin.x - 1.2} y={PIN_Y - 1.5} width={0.9} height={3} rx={0.4} fill="#ffffff" opacity={0.55} />
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

export const Rc522Renderer = memo(Rc522RendererInner)
