"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 280
const H = 150

function Oled13RendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const line1 = typeof component.metadata.line1 === "string" ? component.metadata.line1 : "SolderHub"
  const line2 = typeof component.metadata.line2 === "string" ? component.metadata.line2 : "1.3-inch OLED"
  const displayOn = component.metadata.backlight !== false

  const screenX = 23
  const screenY = 18
  const screenW = 234
  const screenH = 96

  return (
    <g data-component-id={component.id}>
      {/* PCB substrate, silkscreen, and mounting holes */}
      <rect
        x={2}
        y={2}
        width={W - 4}
        height={H - 4}
        rx={7}
        fill="url(#sim-pcb-blue)"
        stroke={selected ? "var(--primary)" : "#123c6e"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />
      <path d="M 20 33 H 12 V 57 H 20 M 260 31 H 269 V 57 H 260 M 17 119 H 30 V 125 H 46 M 159 125 H 174 V 120 H 184" fill="none" stroke="#45a5bd" strokeWidth={1} opacity={0.7} />
      {[[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={6.2} fill="#dce7eb" stroke="#153e5e" strokeWidth={1.8} />
          <circle cx={cx} cy={cy} r={3.1} fill="#0a192c" />
          <circle cx={cx} cy={cy} r={1} fill="#7a8791" />
        </g>
      ))}

      {/* Tiny surface-mount parts and controller detail around the display */}
      <g>
        <rect x={8} y={67} width={9} height={15} rx={1.2} fill="#111827" stroke="#9ca3af" strokeWidth={0.8} />
        <path d="M 10 70 H 15 M 10 74 H 15 M 10 78 H 15" stroke="#d1d5db" strokeWidth={0.8} />
        <rect x={263} y={68} width={9} height={15} rx={1.2} fill="#111827" stroke="#9ca3af" strokeWidth={0.8} />
        <path d="M 265 71 H 270 M 265 75 H 270 M 265 79 H 270" stroke="#d1d5db" strokeWidth={0.8} />
        <rect x={39} y={119} width={21} height={5} rx={1} fill="#151b23" stroke="#73808b" strokeWidth={0.6} />
        <rect x={43} y={120} width={4} height={3} fill="#d1d5db" />
        <rect x={51} y={120} width={4} height={3} fill="#d1d5db" />
        <rect x={68} y={119} width={10} height={5} rx={1} fill="#bc7a37" stroke="#7c4a21" strokeWidth={0.6} />
        <rect x={71} y={119} width={1.5} height={5} fill="#e7c27e" />
        <rect x={74} y={119} width={1.5} height={5} fill="#3b2b24" />
      </g>

      {/* Layered black bezel and reflective glass */}
      <rect x={screenX - 6} y={screenY - 6} width={screenW + 12} height={screenH + 12} rx={5} fill="#05080c" stroke="#aab6c2" strokeWidth={1.6} filter="url(#sim-drop-shadow-sm)" />
      <rect x={screenX - 2} y={screenY - 2} width={screenW + 4} height={screenH + 4} rx={3} fill="#10161d" stroke="#283746" strokeWidth={1} />
      <rect
        x={screenX}
        y={screenY}
        width={screenW}
        height={screenH}
        rx={1.5}
        fill={displayOn ? "#04111c" : "#02050a"}
        stroke={displayOn ? "#1c465a" : "#202b35"}
        strokeWidth={1}
      />

      {/* A subtle OLED pixel matrix gives the active glass a physical pixel texture */}
      {displayOn && (
        <g fill="#0c4253" opacity={0.58}>
          {Array.from({ length: 11 }).flatMap((_, row) =>
            Array.from({ length: 32 }).map((__, col) => (
              <circle key={`pixel-${row}-${col}`} cx={screenX + 5 + col * 7.1} cy={screenY + 5 + row * 7.8} r={0.8} />
            )),
          )}
        </g>
      )}

      {displayOn && (
        <g>
          {/* Screen status line */}
          <text x={screenX + 9} y={screenY + 12} fill="#42bcd7" fontSize={5.8} fontFamily="ui-monospace, monospace" letterSpacing={0.8}>SH1106 · 128 × 64</text>
          <text x={screenX + screenW - 9} y={screenY + 12} textAnchor="end" fill="#42bcd7" fontSize={5.8} fontFamily="ui-monospace, monospace">I2C 0x3C</text>
          <path d={`M ${screenX + 8} ${screenY + 17} H ${screenX + screenW - 8}`} stroke="#17536a" strokeWidth={0.8} />

          {/* User-visible demo content */}
          <text
            x={screenX + screenW / 2}
            y={screenY + 39}
            textAnchor="middle"
            fill="#8be9fd"
            fontFamily="ui-monospace, monospace"
            fontSize={17}
            fontWeight={700}
          >
            {line1.slice(0, 20)}
          </text>
          <text
            x={screenX + screenW / 2}
            y={screenY + 56}
            textAnchor="middle"
            fill="#52d8f1"
            fontFamily="ui-monospace, monospace"
            fontSize={10.5}
            fontWeight={600}
          >
            {line2.slice(0, 24)}
          </text>

          {/* Decorative waveform / pixel graph */}
          <path d={`M ${screenX + 14} ${screenY + 76} H ${screenX + 29} l 8 -7 l 8 10 l 9 -14 l 8 11 l 8 -4 H ${screenX + 104} l 8 -8 l 8 13 l 8 -5 H ${screenX + 155} l 8 -10 l 8 7 l 8 -3 H ${screenX + screenW - 14}`} fill="none" stroke="#26c6e8" strokeWidth={1.5} strokeLinejoin="round" opacity={0.95} />
          <circle cx={screenX + screenW - 14} cy={screenY + 76} r={2.2} fill="#a5f3fc" />
          <text x={screenX + 9} y={screenY + screenH - 4} fill="#3e9fb6" fontSize={5.2} fontFamily="ui-monospace, monospace">DISPLAY READY</text>
        </g>
      )}

      {/* PCB footer stays clear of the four-pin I2C header */}
      <text x={27} y={136} textAnchor="start" fill="#dbeafe" fontSize={7} fontWeight={800} letterSpacing={0.9}>SOLDERHUB</text>
      <text x={27} y={143} textAnchor="start" fill="#9fc5e8" fontSize={5.8} letterSpacing={0.45}>1.3-IN OLED MODULE</text>

      {/* Gold-plated I2C header pads, pin labels, and wire hit targets */}
      <rect x={187} y={140} width={80} height={9} rx={1.5} fill="#111820" stroke="#6b7785" strokeWidth={0.7} />
      {pins.map((pin) => (
        <g key={pin.id}>
          <rect x={pin.x - 4} y={142} width={8} height={5.5} rx={1} fill="#d4a253" stroke="#825b25" strokeWidth={0.55} />
          <rect x={pin.x - 2.5} y={143} width={5} height={3.5} rx={0.6} fill="#f1d08b" opacity={0.9} />
          <text x={pin.x} y={136} textAnchor="middle" fill="#eff6ff" fontSize={6.2} fontWeight={700}>{pin.name}</text>
          <line x1={pin.x} y1={147} x2={pin.x} y2={pin.y} stroke="#d0d5da" strokeWidth={2} />
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

export const Oled13Renderer = memo(Oled13RendererInner)
