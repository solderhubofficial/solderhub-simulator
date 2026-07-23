"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const BOARD_WIDTH = 220
const BOARD_HEIGHT = 480

function Esp32DevkitRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const io2On = simulation?.pinStates[
    pins.find((p) => p.name === "IO2")?.id ?? ""
  ]?.state === "HIGH"
  const anyActive = simulation && Object.values(simulation.pinStates).some((s) => s.state === "HIGH")
  const cx = BOARD_WIDTH / 2

  return (
    <g data-component-id={component.id}>
      {/* Board body */}
      <rect
        x={0}
        y={0}
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        rx={10}
        fill="url(#sim-pcb-dark)"
        stroke={selected ? "var(--primary)" : "#44475A"}
        strokeWidth={selected ? 2.5 : 1.5}
        filter="url(#sim-drop-shadow)"
      />

      {/* Faint copper trace texture */}
      <g opacity={0.14} stroke="#8be9fd" strokeWidth={1} fill="none">
        <path d={`M 30 90 h ${BOARD_WIDTH - 60} `} />
        <path d="M 30 90 v 30 h 20" />
        <path d={`M ${BOARD_WIDTH - 30} 90 v 30 h -20`} />
        <path d="M 30 350 h 30 v 20" />
        <path d={`M ${BOARD_WIDTH - 30} 350 h -30 v 20`} />
      </g>

      {/* Mounting holes */}
      {[[10, 10], [BOARD_WIDTH - 10, 10], [10, BOARD_HEIGHT - 10], [BOARD_WIDTH - 10, BOARD_HEIGHT - 10]].map(
        ([mx, my]) => (
          <g key={`${mx}-${my}`}>
            <circle cx={mx} cy={my} r={4.5} fill="#1a1c23" stroke="#000" strokeWidth={1} />
            <circle cx={mx} cy={my} r={2} fill="#000" />
          </g>
        )
      )}

      {/* Micro-USB port (top-center) */}
      <rect x={cx - 18} y={-11} width={36} height={22} rx={3} fill="url(#sim-metal)" stroke="#3f4252" filter="url(#sim-drop-shadow-sm)" />
      <rect x={cx - 13} y={-7} width={26} height={12} rx={1.5} fill="#2b2d38" stroke="#15161c" />
      <rect x={cx - 10} y={-4} width={20} height={6} fill="#141419" />

      {/* EN / BOOT tactile buttons */}
      <g>
        <rect x={16} y={20} width={16} height={16} rx={2} fill="url(#sim-metal)" stroke="#3f4252" />
        <circle cx={24} cy={28} r={5} fill="#2b2d38" stroke="#15161c" />
        <text x={24} y={46} textAnchor="middle" fill="#6272A4" fontSize={6.5}>EN</text>
        <rect x={BOARD_WIDTH - 32} y={20} width={16} height={16} rx={2} fill="url(#sim-metal)" stroke="#3f4252" />
        <circle cx={BOARD_WIDTH - 24} cy={28} r={5} fill="#2b2d38" stroke="#15161c" />
        <text x={BOARD_WIDTH - 24} y={46} textAnchor="middle" fill="#6272A4" fontSize={6.5}>BOOT</text>
      </g>

      {/* Label */}
      <text x={cx} y={70} textAnchor="middle" fill="#F8F8F2" fontSize={14} fontWeight="bold" letterSpacing={0.5}>
        ESP32
      </text>
      <text x={cx} y={86} textAnchor="middle" fill="#6272A4" fontSize={9}>
        DEVKIT 38-pin
      </text>

      {/* ESP32-WROOM-32 module shield can, with castellated edge + antenna */}
      <rect x={cx - 48} y={128} width={96} height={110} rx={3} fill="#1A1C23" stroke="#6272A4" strokeWidth={1.2} filter="url(#sim-drop-shadow-sm)" />
      {/* Castellations along shield edges */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`cast-l-${i}`} x={cx - 50} y={134 + i * 16} width={4} height={7} fill="#0e0f14" />
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={`cast-r-${i}`} x={cx + 46} y={134 + i * 16} width={4} height={7} fill="#0e0f14" />
      ))}
      <text x={cx} y={175} textAnchor="middle" fill="#8be9fd" fontSize={9} fontWeight={600}>
        ESP32
      </text>
      <text x={cx} y={188} textAnchor="middle" fill="#6272A4" fontSize={7.5}>
        WROOM-32
      </text>
      <rect x={cx - 30} y={198} width={60} height={16} rx={1} fill="#12131a" stroke="#33354a" strokeWidth={0.6} />
      <g opacity={0.6} stroke="#8be9fd" strokeWidth={0.6} fill="none">
        <path d={`M ${cx - 26} 206 h 6 v -3 h 6 v 3 h 6 v -3 h 6 v 3 h 6`} />
      </g>
      {/* PCB trace antenna at the top edge of the module */}
      <path
        d={`M ${cx - 20} 128 v -6 h 8 v -8 h -12 v -8 h 16`}
        fill="none"
        stroke="#8be9fd"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      />

      {/* Power LED + onboard LED on IO2 */}
      <g>
        <rect x={cx + 54} y={56} width={7} height={5} rx={1} fill="#e0392f" stroke="#7a1c15" strokeWidth={0.5} />
        <text x={cx + 57} y={50} textAnchor="middle" fill="#6272A4" fontSize={6}>PWR</text>
        <circle cx={cx + 60} cy={80} r={6} fill={io2On ? "#50FA7B" : "#2c2e3a"} stroke="#6272A4" strokeWidth={1} />
        {io2On && <circle cx={cx + 60} cy={80} r={9} fill="none" stroke="#50FA7B" strokeWidth={1} opacity={0.5} />}
        <text x={cx + 60} y={98} textAnchor="middle" fill="#6272A4" fontSize={8}>
          IO2
        </text>
      </g>
      {anyActive && (
        <text x={cx} y={252} textAnchor="middle" fill="#f1fa8c" fontSize={7} opacity={0.85}>
          ● ACTIVE
        </text>
      )}

      {/* Pin header strips with individual socket holes */}
      <rect x={2} y={40} width={11} height={410} rx={2} fill="#0e0f14" stroke="#000" strokeWidth={0.5} />
      <rect x={BOARD_WIDTH - 13} y={40} width={11} height={410} rx={2} fill="#0e0f14" stroke="#000" strokeWidth={0.5} />
      {pins.map((pin) => (
        <circle
          key={`${pin.id}-hole`}
          cx={pin.x}
          cy={pin.y}
          r={1.7}
          fill="#3a3c48"
          stroke="#000"
          strokeWidth={0.4}
        />
      ))}

      {/* Pin name labels */}
      {pins.map((pin) => {
        const isLeft = pin.x < BOARD_WIDTH / 2
        return (
          <text
            key={`${pin.id}-label`}
            x={isLeft ? pin.x + 16 : pin.x - 16}
            y={pin.y + 3}
            textAnchor={isLeft ? "start" : "end"}
            fill="#8892B0"
            fontSize={8}
            fontFamily="ui-monospace, monospace"
          >
            {pin.name}
          </text>
        )
      })}
      {/* Pin hit areas */}
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

export const Esp32DevkitRenderer = memo(Esp32DevkitRendererInner)