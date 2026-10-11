"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

/** RC522/MFRC522 breakout illustration. Pin labels follow the common 8-pin module. */
function Rc522RendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const powered = simulation?.flags.powered === true
  return (
    <g data-component-id={component.id}>
      <rect x={7} y={5} width={126} height={116} rx={5}
        fill="#087a55" stroke={selected ? "var(--primary)" : "#064b36"}
        strokeWidth={selected ? 2.4 : 1.4} filter="url(#sim-drop-shadow)" />
      <path d="M 12 11 H 128 V 115 H 12 Z" fill="none" stroke="#39a77d" strokeWidth={0.8} opacity={0.7} />
      {[ [15,13], [125,13], [15,113], [125,113] ].map(([x,y],i) => (
        <g key={i}><circle cx={x} cy={y} r={4.2} fill="#c9d0cc" stroke="#233b34" strokeWidth={1}/>
          <circle cx={x} cy={y} r={2.5} fill="#172c29"/></g>
      ))}
      {/* 13.56 MHz antenna loop */}
      <rect x={24} y={15} width={92} height={60} rx={7} fill="none" stroke="#d8a24c" strokeWidth={2.8}/>
      <rect x={29} y={20} width={82} height={50} rx={5} fill="none" stroke="#edbd68" strokeWidth={2.2}/>
      <rect x={34} y={25} width={72} height={40} rx={4} fill="none" stroke="#d8a24c" strokeWidth={2}/>
      <path d="M 39 30 H 101 V 60 H 39 Z" fill="none" stroke="#f1ce88" strokeWidth={1.5}/>
      {/* MFRC522 IC and nearby passives */}
      <rect x={47} y={42} width={39} height={28} rx={2} fill="#1c2427" stroke="#080d0f" strokeWidth={1.2}/>
      {Array.from({length:6},(_,i)=><g key={i} stroke="#c9c9c3" strokeWidth={1.3}>
        <line x1={50+i*5.8} y1={39} x2={50+i*5.8} y2={42}/>
        <line x1={50+i*5.8} y1={70} x2={50+i*5.8} y2={73}/>
      </g>)}
      <text x={66.5} y={54} textAnchor="middle" fontSize={5.8} fontWeight={700} fill="#cbd5d3">MFRC522</text>
      <text x={66.5} y={62} textAnchor="middle" fontSize={4.5} fill="#94a3a0">NFC / RFID</text>
      <rect x={91} y={82} width={13} height={8} rx={1} fill="#d2c7a4" stroke="#4b5147" strokeWidth={0.8}/>
      <rect x={74} y={88} width={9} height={5} rx={1} fill="#d2c7a4" stroke="#4b5147" strokeWidth={0.7}/>
      <circle cx={112} cy={91} r={3} fill={powered ? "#54e39a" : "#b6d3c5"} stroke="#174d38" strokeWidth={1}/>
      <text x={70} y={81} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#e0f2e9">RFID-RC522</text>
      <text x={70} y={99} textAnchor="middle" fontSize={5.8} fill="#d2f4e5">13.56 MHz</text>
      {/* Plated header holes; no protruding pins */}
      {pins.map((pin) => (
        <g key={pin.id}>
          <text x={pin.x} y={131} textAnchor="middle" fontSize={6.4} fontWeight={700} fill="#dbeafe">{pin.name}</text>
          <circle cx={pin.x} cy={139} r={4.1} fill="#d2d7d3" stroke="#6c7772" strokeWidth={0.8}/>
          <circle cx={pin.x} cy={139} r={2.35} fill="#243a34" stroke="#eef2ef" strokeWidth={0.45}/>
          <PinHitArea pin={pin} componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(event) => onPinPointerDown(pin.id, event)} />
        </g>
      ))}
    </g>
  )
}

export const Rc522Renderer = memo(Rc522RendererInner)
