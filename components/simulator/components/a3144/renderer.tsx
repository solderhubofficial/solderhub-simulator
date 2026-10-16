"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { LeadV } from "@/components/simulator/components/base/leads"

/**
 * TO-92 A3144 unipolar Hall switch, viewed from the marked/flat face.
 * Lead order follows the common A3144 datasheet: VCC, GND, OUT.
 * This is original SolderHub SVG artwork, not a copied third-party image.
 */
function A3144RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  const detected = simulation?.flags.magnetDetected === true
  const outputLow = simulation?.flags.outputLow === true
  const leadX = [24, 42, 60]

  return (
    <g data-component-id={component.id}>
      {/* Three formed, tin-plated TO-92 leads */}
      {leadX.map((x) => (
        <LeadV key={x} x={x} y1={65} y2={88} w={3} />
      ))}

      {/* Molded package silhouette with a flat marked face */}
      <path
        d="M 13 20 Q 13 8 25 8 H 59 Q 71 8 71 20 V 58 Q 71 65 63 65 H 21 Q 13 65 13 58 Z"
        fill="#11151b"
        stroke={selected ? "var(--primary)" : "#05070a"}
        strokeWidth={selected ? 2.4 : 1.2}
        filter="url(#sim-drop-shadow-sm)"
      />
      <path
        d="M 16 21 Q 16 11 27 11 H 57 Q 68 11 68 21 V 55 H 16 Z"
        fill="url(#sim-plastic-dark-h)"
        opacity={0.95}
      />
      {/* Mold seam and subtle specular edge */}
      <path d="M 16 54 H 68" stroke="#05070a" strokeWidth={1.1} opacity={0.9} />
      <path d="M 19 18 Q 20 13 27 13 H 43" fill="none" stroke="#ffffff" strokeWidth={1.3} opacity={0.16} strokeLinecap="round" />

      {/* Hall sensing face / magnetic-field cue */}
      <rect x={27} y={17} width={30} height={18} rx={4} fill="#080b10" stroke="#343b46" strokeWidth={0.8} />
      <path
        d="M 34 28 C 34 20 50 20 50 28"
        fill="none"
        stroke={detected ? "#60a5fa" : "#64748b"}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <path
        d="M 38 29 C 38 24 46 24 46 29"
        fill="none"
        stroke={detected ? "#93c5fd" : "#475569"}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <circle cx={42} cy={30} r={2.2} fill={detected ? "#60a5fa" : "#64748b"} />
      {detected && <circle cx={42} cy={30} r={7} fill="#3b82f6" opacity={0.15} filter="url(#sim-glow-blur-sm)" />}

      {/* Marking and live output indicator */}
      <text x={42} y={43} textAnchor="middle" fill="#e5e7eb" fontSize={6.2} fontWeight={800} letterSpacing={0.7}>A3144</text>
      <text x={42} y={50} textAnchor="middle" fill="#8b95a5" fontSize={4.3} fontWeight={600}>HALL SWITCH</text>
      <circle cx={64} cy={13} r={2.8} fill={powered ? (outputLow ? "#38bdf8" : "#22c55e") : "#4b5563"} stroke="#0b0f14" strokeWidth={0.8} />
      <circle cx={64} cy={13} r={1.2} fill="#ffffff" opacity={powered ? 0.7 : 0.15} />

      {/* Pin labels are legible at normal zoom */}
      <g fill="#aeb7c4" fontSize={5.4} fontWeight={700} textAnchor="middle">
        <text x={24} y={61}>VCC</text>
        <text x={42} y={61}>GND</text>
        <text x={60} y={61}>OUT</text>
      </g>
      <text x={42} y={79} textAnchor="middle" fill={detected ? "#60a5fa" : "#64748b"} fontSize={5.2} fontWeight={700}>
        {detected ? "MAGNET" : "NO FIELD"}
      </text>

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

export const A3144Renderer = memo(A3144RendererInner)
