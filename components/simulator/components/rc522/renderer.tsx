"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

/**
 * RC522 blue breakout illustration. The large rectangular copper spiral,
 * blue solder mask, MFRC522 package, passives, mounting holes and 8-pin
 * plated header mirror the common RC522 module layout.
 */
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
  return (
    <g data-component-id={component.id}>
      {/* Blue PCB and subtle solder-mask edge */}
      <rect x={7} y={5} width={166} height={140} rx={3.5}
        fill="#0759a5" stroke={selected ? "var(--primary)" : "#073b70"}
        strokeWidth={selected ? 2.6 : 1.5} filter="url(#sim-drop-shadow)" />
      <rect x={11} y={9} width={158} height={132} rx={2}
        fill="none" stroke="#287bc0" strokeWidth={0.9} opacity={0.9} />

      {/* Four plated mounting holes with exposed metal annuli */}
      {[[15,13],[165,13],[15,137],[165,137]].map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={4.4} fill="#c7d0d6" stroke="#263e55" strokeWidth={1}/>
          <circle cx={x} cy={y} r={2.7} fill="#172b3c" stroke="#f0f2ed" strokeWidth={0.45}/>
        </g>
      ))}

      {/* Broad 13.56 MHz antenna: continuous rectangular copper spiral */}
      <path d="M 29 19 H 151 Q 157 19 157 25 V 91 Q 157 97 151 97 H 29 Q 23 97 23 91 V 25 Q 23 19 29 19 Z"
        fill="none" stroke="#d28a31" strokeWidth={3.2} strokeLinejoin="round"/>
      <path d="M 34 25 H 146 Q 151 25 151 30 V 85 Q 151 91 145 91 H 35 Q 29 91 29 85 V 31 Q 29 25 34 25 Z"
        fill="none" stroke="#f0bb58" strokeWidth={2.7} strokeLinejoin="round"/>
      <path d="M 39 31 H 140 Q 145 31 145 36 V 79 Q 145 85 139 85 H 40 Q 35 85 35 79 V 37 Q 35 31 40 31 Z"
        fill="none" stroke="#d9963d" strokeWidth={2.5} strokeLinejoin="round"/>
      <path d="M 45 37 H 134 Q 139 37 139 42 V 73 Q 139 79 133 79 H 46 Q 41 79 41 73 V 43 Q 41 37 46 37 Z"
        fill="none" stroke="#f0bd60" strokeWidth={2.4} strokeLinejoin="round"/>
      <path d="M 51 43 H 128 V 67 Q 128 73 122 73 H 52 Q 47 73 47 67 V 49 Q 47 43 53 43"
        fill="none" stroke="#d9963d" strokeWidth={2.2} strokeLinejoin="round"/>

      {/* RF matching network and tiny surface-mount parts */}
      <rect x={28} y={105} width={12} height={5} rx={1} fill="#d6d0b4" stroke="#424c56" strokeWidth={0.8}/>
      <rect x={44} y={105} width={10} height={5} rx={1} fill="#d6d0b4" stroke="#424c56" strokeWidth={0.8}/>
      <rect x={58} y={105} width={12} height={5} rx={1} fill="#d6d0b4" stroke="#424c56" strokeWidth={0.8}/>
      <rect x={29} y={117} width={9} height={5} rx={0.8} fill="#c9c8bc" stroke="#51585a" strokeWidth={0.7}/>
      <rect x={42} y={117} width={9} height={5} rx={0.8} fill="#c9c8bc" stroke="#51585a" strokeWidth={0.7}/>
      <rect x={56} y={117} width={9} height={5} rx={0.8} fill="#c9c8bc" stroke="#51585a" strokeWidth={0.7}/>

      {/* MFRC522 IC with visible gull-wing legs */}
      <rect x={82} y={102} width={42} height={29} rx={1.8} fill="#171d22" stroke="#080c10" strokeWidth={1.1}/>
      {Array.from({length:7},(_,i)=><g key={i} stroke="#c7cbd0" strokeWidth={1.2}>
        <line x1={85+i*5.7} y1={99} x2={85+i*5.7} y2={102}/>
        <line x1={85+i*5.7} y1={131} x2={85+i*5.7} y2={134}/>
      </g>)}
      <path d="M 85 105 H 121" stroke="#414a52" strokeWidth={0.7}/>
      <text x={103} y={114} textAnchor="middle" fontSize={6.3} fontWeight={700} fill="#d7dce0">MFRC522</text>
      <text x={103} y={122} textAnchor="middle" fontSize={4.9} fill="#a9b4bc">NFC CONTROLLER</text>

      {/* Power/status LED and board silkscreen */}
      <circle cx={143} cy={113} r={3.1} fill={powered ? "#5cff9a" : "#b4d7c8"} stroke="#1e3d58" strokeWidth={0.9}/>
      {cardPresent && <circle cx={143} cy={113} r={5.2} fill="#5cff9a" opacity={0.22}/>}
      <text x={143} y={124} textAnchor="middle" fontSize={5.4} fontWeight={700} fill="#e2efff">PWR</text>
      <text x={75} y={137} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#e4f2ff">RFID-RC522</text>

      {/* Full pin names aligned directly with each plated hole */}
      {pins.map((pin) => (
        <g key={pin.id}>
          <text x={pin.x} y={153} textAnchor="middle" fontSize={6.1}
            fontWeight={700} fill="#dcecff" stroke="#06427c" strokeWidth={0.35}
            paintOrder="stroke">{pin.name}</text>
          <circle cx={pin.x} cy={163} r={4.5} fill="#c8d0d2" stroke="#6f7d83" strokeWidth={0.9}/>
          <circle cx={pin.x} cy={163} r={2.65} fill="#1b2f40" stroke="#f0f2ed" strokeWidth={0.55}/>
          <PinHitArea pin={pin} componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(event) => onPinPointerDown(pin.id, event)} />
        </g>
      ))}
    </g>
  )
}

export const Rc522Renderer = memo(Rc522RendererInner)
