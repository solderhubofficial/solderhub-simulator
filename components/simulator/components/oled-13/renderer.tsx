"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// 1.3" I2C OLED module, drawn like the reference artwork: royal-blue board
// with red-ringed mounting holes, a four-pin gold header along the top edge,
// a silver frame around the black glass, a status-bar + clock + temperature
// demo screen, and the gold flex-cable tail under the display.
const W = 220
const H = 210

// Glass area
const GX = 17
const GY = 44
const GW = 186
const GH = 133

const STATUS_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const SCREEN_TEXT = "#e8f3ff"
const SCREEN_ACCENT = "#5cc8ff"

function Oled13RendererInner({
  component,
  pins,
  selected,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const time = typeof component.metadata.time === "string" ? component.metadata.time : "12:34"
  const temperature = typeof component.metadata.temperature === "string" ? component.metadata.temperature : "25°C"
  const displayOn = component.metadata.backlight !== false
  const edge = selected ? "var(--primary)" : "#0d2f63"

  return (
    <g data-component-id={component.id}>
      {/* Board */}
      <rect
        x={2}
        y={2}
        width={W - 4}
        height={H - 4}
        rx={11}
        fill="url(#sim-pcb-royal)"
        stroke={edge}
        strokeWidth={selected ? 2.6 : 1.4}
        filter="url(#sim-drop-shadow)"
      />
      <rect x={6} y={6} width={W - 12} height={H - 12} rx={8} fill="none" stroke="#7fb2f2" strokeWidth={0.6} opacity={0.35} />
      <rect x={8} y={3.4} width={W - 16} height={2.6} rx={1.3} fill="#ffffff" opacity={0.14} />

      {/* Mounting holes with red copper rings */}
      {[[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={8} fill="#c9192b" stroke="#6e0b17" strokeWidth={0.8} />
          <circle cx={cx} cy={cy} r={6.6} fill="none" stroke="#ff7b88" strokeWidth={0.6} opacity={0.7} />
          <circle cx={cx} cy={cy} r={4.4} fill="#081428" stroke="#050b17" strokeWidth={0.6} />
          <circle cx={cx - 1.2} cy={cy - 1.3} r={1.1} fill="#ffffff" opacity={0.2} />
        </g>
      ))}

      {/* Pin names, one above each header pin's matching silkscreen slot */}
      <g fill="#f3f8ff" fontSize={6.6} fontWeight={700} textAnchor="middle" fontFamily={STATUS_FONT}>
        {pins.map((pin) => (
          <text key={`label-${pin.id}`} x={pin.x} y={31}>
            {pin.name}
          </text>
        ))}
      </g>

      {/* 4-pin header: black housing with gold square pins */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={76} y={3} width={98} height={13} rx={1.6} fill="url(#sim-plastic-dark)" stroke="#000000" strokeWidth={0.6} />
      </g>
      <rect x={77} y={3.8} width={96} height={1.1} rx={0.55} fill="#ffffff" opacity={0.22} />
      {[101, 125, 149].map((x) => (
        <line key={x} x1={x} y1={4.4} x2={x} y2={14.6} stroke="#000000" strokeOpacity={0.55} strokeWidth={0.6} />
      ))}
      {pins.map((pin) => (
        <g key={pin.id}>
          <rect x={pin.x - 2.8} y={pin.y - 2.8} width={5.6} height={5.6} rx={0.7} fill="url(#sim-gold-v)" stroke="#7e5f14" strokeWidth={0.35} />
          <rect x={pin.x - 1.7} y={pin.y - 2.2} width={1.1} height={4.4} rx={0.5} fill="#ffffff" opacity={0.55} />
        </g>
      ))}

      {/* Flex-cable tail under the display */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={62} y={170} width={96} height={26} rx={1.6} fill="url(#sim-brass)" stroke="#7a5a12" strokeWidth={0.6} />
      </g>
      <g stroke="#7a5510" strokeWidth={0.55} opacity={0.65}>
        {Array.from({ length: 31 }, (_, i) => (
          <line key={i} x1={65 + i * 3} y1={182} x2={65 + i * 3} y2={194} />
        ))}
      </g>
      <rect x={56} y={190} width={108} height={9} rx={1.2} fill="url(#sim-plastic-dark)" stroke="#000000" strokeWidth={0.6} />
      <rect x={57} y={190.8} width={106} height={1} rx={0.5} fill="#ffffff" opacity={0.2} />

      {/* Silver frame + glass */}
      <g filter="url(#sim-drop-shadow-sm)">
        <rect x={GX - 6} y={GY - 6} width={GW + 12} height={GH + 12} rx={6} fill="url(#sim-oled-bezel)" stroke="#6f7a87" strokeWidth={0.9} />
      </g>
      <rect x={GX - 4.6} y={GY - 4.6} width={GW + 9.2} height={1.2} rx={0.6} fill="#ffffff" opacity={0.7} />
      <rect x={GX - 1.5} y={GY - 1.5} width={GW + 3} height={GH + 3} rx={3.5} fill="#0a0e14" stroke="#566170" strokeWidth={0.7} />
      <rect x={GX} y={GY} width={GW} height={GH} rx={2.5} fill={displayOn ? "#03060c" : "#010204"} stroke="#1c3350" strokeWidth={0.8} />
      {displayOn && <rect x={GX} y={GY} width={GW} height={GH} rx={2.5} fill="url(#sim-oled-glow)" />}

      {displayOn && (
        <g fontFamily={STATUS_FONT}>
          {/* Signal bars (top-left) */}
          <g fill={SCREEN_ACCENT}>
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={GX + 13 + i * 5.2} y={GY + 24 - (i + 1) * 4.2} width={3.2} height={(i + 1) * 4.2} rx={0.6} opacity={i === 3 ? 0.4 : 1} />
            ))}
          </g>

          {/* Battery (top-right) */}
          <rect x={GX + GW - 41} y={GY + 9} width={25} height={12} rx={2.4} fill="none" stroke={SCREEN_ACCENT} strokeWidth={1.4} />
          <rect x={GX + GW - 15} y={GY + 12.4} width={2.6} height={5.2} rx={0.8} fill={SCREEN_ACCENT} />
          <rect x={GX + GW - 38.6} y={GY + 11.4} width={17} height={7.2} rx={1.2} fill={SCREEN_ACCENT} />

          {/* Clock */}
          <text x={GX + GW / 2} y={GY + 78} textAnchor="middle" fontSize={45} fontWeight={700} fill="#4fb8ff" opacity={0.55} filter="url(#sim-glow-blur-sm)" letterSpacing={1}>
            {time}
          </text>
          <text x={GX + GW / 2} y={GY + 78} textAnchor="middle" fontSize={45} fontWeight={700} fill={SCREEN_TEXT} letterSpacing={1}>
            {time}
          </text>

          {/* Waveform (bottom-left) */}
          <path
            d={`M ${GX + 13} ${GY + 108} c 8 -11 15 -11 23 0 s 15 11 23 0 s 15 -11 23 0`}
            fill="none"
            stroke={SCREEN_ACCENT}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Temperature (bottom-right) */}
          <text x={GX + GW - 13} y={GY + 114} textAnchor="end" fontSize={17} fontWeight={700} fill={SCREEN_TEXT}>
            {temperature}
          </text>
        </g>
      )}

      {/* Glass reflection */}
      <rect x={GX} y={GY} width={GW} height={GH} rx={2.5} fill="url(#sim-oled-glass)" style={{ pointerEvents: "none" }} />

      {/* Board silkscreen */}
      <g fill="#e6f0ff" fontFamily={STATUS_FONT} opacity={0.9}>
        <text x={30} y={200} fontSize={5.8} fontWeight={700} letterSpacing={0.5}>1.3&quot; OLED</text>
        <text x={W - 30} y={200} fontSize={5.8} fontWeight={700} letterSpacing={0.5} textAnchor="end">I2C</text>
      </g>

      {pins.map((pin) => (
        <PinHitArea
          key={`hit-${pin.id}`}
          pin={pin}
          componentId={component.id}
          onClick={() => onPinClick(pin.id)}
          onPointerDown={(event) => onPinPointerDown(pin.id, event)}
        />
      ))}
    </g>
  )
}

export const Oled13Renderer = memo(Oled13RendererInner)
