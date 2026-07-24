"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const W = 450
const H = 350

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

  // Map pin names to new positions matching the visual layout
  function getPinPosition(name: string): { x: number; y: number } | null {
    // Digital header (right side, top)
    const digitalNames = ["GND", "D13", "D12", "D11", "D10", "D9", "D8"]
    const digIndex = digitalNames.indexOf(name)
    if (digIndex !== -1) {
      return { x: 438, y: 20 + digIndex * 12 } // center of header, first hole y=20, spacing 12
    }

    // Power header (bottom-left)
    const powerNames = ["IOREF", "RESET", "3.3V", "5V", "GND", "GND", "VIN"]
    const powIndex = powerNames.indexOf(name)
    if (powIndex !== -1) {
      return { x: 338, y: 264 + powIndex * 10 } // center, first hole y=264, spacing 10
    }

    // Analog header (bottom-right)
    const analogNames = ["A0", "A1", "A2", "A3", "A4", "A5"]
    const anaIndex = analogNames.indexOf(name)
    if (anaIndex !== -1) {
      return { x: 438, y: 264 + anaIndex * 10 } // center, first hole y=264, spacing 10
    }

    // Special: D13 LED (onboard) – near the L LED
    if (name === "D13") {
      return { x: 266, y: 250 }
    }

    // If not found, return null – we'll fall back to existing pin coords
    return null
  }

  return (
    <g data-component-id={component.id}>
      <defs>
        {/* Board Gradients */}
        <linearGradient id="pcbBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f4b7a" />
          <stop offset="100%" stopColor="#06213a" />
        </linearGradient>
        <linearGradient id="pcbOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a8acc" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#02101e" stopOpacity="0.5" />
        </linearGradient>

        {/* Metal Gradients */}
        <linearGradient id="metalGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5e7b0" />
          <stop offset="30%" stopColor="#e8c85a" />
          <stop offset="70%" stopColor="#b8942a" />
          <stop offset="100%" stopColor="#7a5e1a" />
        </linearGradient>
        <linearGradient id="metalSilver" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="40%" stopColor="#d0d0d0" />
          <stop offset="100%" stopColor="#888888" />
        </linearGradient>
        <linearGradient id="metalDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4a4a4a" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        
        {/* Header Plastic */}
        <linearGradient id="headerPlastic" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>

        {/* IC Body */}
        <linearGradient id="icBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>

        {/* LED Gradients */}
        <radialGradient id="ledGreenOn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#66ff88" />
          <stop offset="60%" stopColor="#33cc55" />
          <stop offset="100%" stopColor="#1a7a33" />
        </radialGradient>
        <radialGradient id="ledGreenOff" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a4a2a" />
          <stop offset="100%" stopColor="#0a2a15" />
        </radialGradient>
        <radialGradient id="ledYellowOn" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdd44" />
          <stop offset="60%" stopColor="#ffaa00" />
          <stop offset="100%" stopColor="#cc7700" />
        </radialGradient>
        <radialGradient id="ledYellowOff" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4a3a1a" />
          <stop offset="100%" stopColor="#2a1a0a" />
        </radialGradient>

        {/* Filters */}
        <filter id="shadowLarge" x="-5%" y="-5%" width="115%" height="115%">
          <feDropShadow dx="4" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id="shadowMedium" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="shadowSmall" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowYellow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ===== BOARD SUBSTRATE ===== */}
      <rect x="0" y="0" width={W} height={H} rx="10" fill="url(#pcbBlue)" filter="url(#shadowLarge)" />
      <rect x="5" y="5" width={W - 10} height={H - 10} rx="7" fill="url(#pcbOverlay)" />
      <rect x="0" y="0" width={W} height={H} rx="10" fill="none" stroke="#3a9ad9" strokeWidth="1.5" opacity="0.3" />

      {/* ===== COPPER TRACES ===== */}
      <g opacity="0.15" stroke="#d4b84a" strokeWidth="0.8" fill="none">
        <path d="M 90 85 h 80 v 30 h 50" />
        <path d="M 330 85 h -60 v 45" />
        <path d="M 350 310 v -45 h 70" />
        <path d="M 160 310 v -35 h -60" />
        <path d="M 75 145 h 25 v 100" />
        <path d="M 430 135 v 70 h -25" />
        <path d="M 210 105 h 35 v 35" />
        <path d="M 310 290 v -45 h -50" />
        <path d="M 110 220 h 50 v 25 h 40" />
        <path d="M 400 195 v 45 h -25" />
        <circle cx="220" cy="260" r="30" strokeWidth="0.6" />
        <circle cx="380" cy="95" r="22" strokeWidth="0.6" />
      </g>

      {/* Copper vias */}
      <g fill="#c4a030" opacity="0.25">
        <circle cx="85" cy="115" r="2.5" />
        <circle cx="155" cy="175" r="2.5" />
        <circle cx="230" cy="145" r="2.5" />
        <circle cx="410" cy="235" r="2.5" />
        <circle cx="315" cy="325" r="2.5" />
        <circle cx="440" cy="295" r="2.5" />
        <circle cx="135" cy="260" r="2.5" />
        <circle cx="375" cy="155" r="2.5" />
      </g>

      {/* ===== MOUNTING HOLES ===== */}
      {[[18, 18], [482, 18], [18, 382], [482, 382]].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="8" fill="#06213a" stroke="#0f4b7a" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="4.5" fill="#02101e" />
          <circle cx={cx} cy={cy} r="2.5" fill="#000" />
        </g>
      ))}

      {/* ===== USB-B PORT ===== */}
      <g transform="translate(18, 12)">
        <rect x="0" y="0" width="52" height="32" rx="3" fill="url(#metalDark)" stroke="#444" strokeWidth="0.5" filter="url(#shadowMedium)" />
        <rect x="2" y="2" width="48" height="8" rx="1" fill="url(#metalSilver)" />
        <rect x="6" y="12" width="40" height="14" rx="1.5" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
        <rect x="10" y="14" width="32" height="10" rx="1" fill="#0a0a0a" />
        <path d="M 26 7 l -4 6 h 8 z" fill="#888" />
        <rect x="4" y="18" width="2.5" height="4" fill="url(#metalSilver)" rx="0.5" />
        <rect x="45.5" y="18" width="2.5" height="4" fill="url(#metalSilver)" rx="0.5" />
      </g>

      {/* ===== DC BARREL JACK ===== */}
      <g transform="translate(12, 348)">
        <rect x="0" y="0" width="48" height="38" rx="3" fill="#1a1a1a" stroke="#000" filter="url(#shadowMedium)" />
        <circle cx="24" cy="19" r="14" fill="url(#metalSilver)" stroke="#555" strokeWidth="1.5" />
        <circle cx="24" cy="19" r="9.5" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
        <circle cx="24" cy="19" r="4" fill="#1a1a1a" />
        <circle cx="24" cy="19" r="1.8" fill="#555" />
        <rect x="20" y="0" width="8" height="6" fill="#222" rx="1" />
      </g>

      {/* ===== RESET BUTTON ===== */}
      <g transform="translate(90, 18)">
        <rect x="0" y="0" width="24" height="24" rx="2.5" fill="url(#metalDark)" stroke="#555" filter="url(#shadowSmall)" />
        <rect x="2" y="2" width="20" height="20" rx="2" fill="#cc3333" stroke="#881a1a" strokeWidth="0.8" />
        <circle cx="7.5" cy="7.5" r="2.8" fill="#fff" opacity="0.25" />
        <text x="12" y="38" textAnchor="middle" fill="#bfe6f5" fontSize="7" fontWeight="600" letterSpacing="0.8">RESET</text>
      </g>

      {/* ===== 16MHz CRYSTAL ===== */}
      <g transform="translate(145, 158)">
        <rect x="0" y="0" width="28" height="18" rx="2" fill="url(#metalSilver)" stroke="#999" filter="url(#shadowSmall)" />
        <rect x="2" y="2" width="24" height="14" rx="1" fill="url(#metalGold)" opacity="0.5" />
        <text x="14" y="12" textAnchor="middle" fill="#333" fontSize="5.5" fontWeight="bold">16M</text>
        <rect x="0" y="5" width="3" height="8" fill="#aaa" rx="0.5" />
        <rect x="25" y="5" width="3" height="8" fill="#aaa" rx="0.5" />
      </g>

      {/* ===== ATmega328P IC ===== */}
      <g transform="translate(185, 142)">
        <rect x="0" y="0" width="130" height="48" rx="2.5" fill="url(#icBody)" stroke="#222" filter="url(#shadowMedium)" />
        <path d="M 8 6 a 9 9 0 0 0 18 0 Z" fill="#1a1a1a" stroke="#333" />
        
        {/* Top Pins */}
        {[4, 12.4, 20.8, 29.2, 37.6, 46, 54.4, 62.8, 71.2, 79.6, 88, 96.4, 104.8, 113.2].map((x) => (
          <rect key={`top-pin-${x}`} x={x} y="-4" width="3.5" height="8" fill="url(#metalSilver)" stroke="#777" strokeWidth="0.3" rx="0.5" />
        ))}
        {/* Bottom Pins */}
        {[4, 12.4, 20.8, 29.2, 37.6, 46, 54.4, 62.8, 71.2, 79.6, 88, 96.4, 104.8, 113.2].map((x) => (
          <rect key={`bot-pin-${x}`} x={x} y="44" width="3.5" height="8" fill="url(#metalSilver)" stroke="#777" strokeWidth="0.3" rx="0.5" />
        ))}
        
        <text x="65" y="26" textAnchor="middle" fill="#888" fontSize="9" fontWeight="bold" letterSpacing="0.5">ATMEGA328P</text>
        <text x="65" y="37" textAnchor="middle" fill="#666" fontSize="5.5">ARDUINO</text>
        <circle cx="12" cy="12" r="1.5" fill="#777" />
      </g>

      {/* ===== ICSP HEADERS ===== */}
      {/* ICSP1 (Near ATmega) */}
      <g transform="translate(330, 148)">
        <rect x="0" y="0" width="28" height="18" rx="1.5" fill="#1a1a1a" stroke="#333" filter="url(#shadowSmall)" />
        {[4, 14].map((x) => (
          [4, 9.5, 15].map((y) => (
            <rect key={`icsp1-${x}-${y}`} x={x} y={y} width="2.5" height="2.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" rx="0.5" />
          ))
        ))}
        <text x="14" y="28" textAnchor="middle" fill="#bfe6f5" fontSize="5.5" fontWeight="500">ICSP</text>
      </g>

      {/* ICSP2 (Near USB) */}
      <g transform="translate(90, 148)">
        <rect x="0" y="0" width="28" height="18" rx="1.5" fill="#1a1a1a" stroke="#333" filter="url(#shadowSmall)" />
        {[4, 14].map((x) => (
          [4, 9.5, 15].map((y) => (
            <rect key={`icsp2-${x}-${y}`} x={x} y={y} width="2.5" height="2.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" rx="0.5" />
          ))
        ))}
        <text x="14" y="28" textAnchor="middle" fill="#bfe6f5" fontSize="5.5" fontWeight="500">ICSP2</text>
      </g>

      {/* ===== LEDS ===== */}
      {/* TX LED */}
      <g transform="translate(200, 210)">
        <rect x="0" y="0" width="12" height="7" rx="1.5" fill="#4a3a1a" stroke="#2a1a0a" strokeWidth="0.5" filter="url(#shadowSmall)" />
        <rect x="1" y="1" width="10" height="5" rx="1" fill={rxTxActive ? "url(#ledYellowOn)" : "url(#ledYellowOff)"} filter={rxTxActive ? "url(#glowYellow)" : ""} />
        <text x="6" y="21" textAnchor="middle" fill="#bfe6f5" fontSize="7" fontWeight="500">TX</text>
        <text x="-6" y="5" textAnchor="end" fill="#88c8a0" fontSize="6" fontWeight="500">TX0</text>
      </g>

      {/* RX LED */}
      <g transform="translate(200, 242)">
        <rect x="0" y="0" width="12" height="7" rx="1.5" fill="#4a3a1a" stroke="#2a1a0a" strokeWidth="0.5" filter="url(#shadowSmall)" />
        <rect x="1" y="1" width="10" height="5" rx="1" fill={rxTxActive ? "url(#ledYellowOn)" : "url(#ledYellowOff)"} filter={rxTxActive ? "url(#glowYellow)" : ""} />
        <text x="6" y="21" textAnchor="middle" fill="#bfe6f5" fontSize="7" fontWeight="500">RX</text>
        <text x="-6" y="5" textAnchor="end" fill="#88c8a0" fontSize="6" fontWeight="500">RX0</text>
      </g>

      {/* ON LED */}
      <g transform="translate(260, 214)">
        <rect x="0" y="0" width="12" height="7" rx="1.5" fill="#0a2a15" stroke="#051a0e" strokeWidth="0.5" filter="url(#shadowSmall)" />
        <rect x="1" y="1" width="10" height="5" rx="1" fill="url(#ledGreenOn)" filter="url(#glowGreen)" />
        <text x="6" y="21" textAnchor="middle" fill="#bfe6f5" fontSize="7" fontWeight="500">ON</text>
      </g>

      {/* L LED */}
      <g transform="translate(260, 246)">
        <circle cx="6" cy="5" r="6" fill="#0a2a15" stroke="#051a0e" strokeWidth="0.8" filter="url(#shadowSmall)" />
        <circle cx="6" cy="5" r="4.5" fill={onLed ? "url(#ledGreenOn)" : "url(#ledGreenOff)"} filter={onLed ? "url(#glowGreen)" : ""} />
        <text x="6" y="21" textAnchor="middle" fill="#bfe6f5" fontSize="7" fontWeight="500">L</text>
      </g>

      {/* ===== DIGITAL HEADER (Top Right) ===== */}
      <g transform="translate(430, 16)">
        <rect x="0" y="0" width="16" height="90" rx="2" fill="url(#headerPlastic)" stroke="#111" strokeWidth="0.5" filter="url(#shadowMedium)" />
        {/* Pin Holes */}
        {[4, 16, 28, 40, 52, 64, 76].map((y) => (
          <g key={`dig-${y}`}>
            <rect x="3" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
            <rect x="10" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
          </g>
        ))}
        {/* Labels */}
        <text x="8" y="-6" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">GND</text>
        <text x="8" y="6" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">13</text>
        <text x="8" y="18" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">12</text>
        <text x="8" y="30" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">11</text>
        <text x="8" y="42" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">10</text>
        <text x="8" y="54" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">9</text>
        <text x="8" y="66" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">8</text>
        
        {/* Pin 1 Marker */}
        <text x="-4" y="8" textAnchor="end" fill="#dff3fb" fontSize="7" fontWeight="bold">1</text>
      </g>
      <text x="438" y="115" textAnchor="middle" fill="#88c8a0" fontSize="6" fontWeight="500">DIGITAL (PWM~)</text>

      {/* ===== POWER HEADER (Bottom Left) ===== */}
      <g transform="translate(330, 260)">
        <rect x="0" y="0" width="16" height="90" rx="2" fill="url(#headerPlastic)" stroke="#111" strokeWidth="0.5" filter="url(#shadowMedium)" />
        {/* Pin Holes */}
        {[4, 14, 24, 34, 44, 54, 64].map((y) => (
          <g key={`pow-${y}`}>
            <rect x="3" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
            <rect x="10" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
          </g>
        ))}
        {/* Labels */}
        <text x="8" y="-6" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">IOREF</text>
        <text x="8" y="6" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">RESET</text>
        <text x="8" y="16" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">3.3V</text>
        <text x="8" y="26" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">5V</text>
        <text x="8" y="36" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">GND</text>
        <text x="8" y="46" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">GND</text>
        <text x="8" y="56" textAnchor="middle" fill="#dff3fb" fontSize="5.5" fontFamily="monospace">VIN</text>
      </g>
      <text x="338" y="360" textAnchor="middle" fill="#88c8a0" fontSize="6" fontWeight="500">POWER</text>

      {/* ===== ANALOG HEADER (Bottom Right) ===== */}
      <g transform="translate(430, 260)">
        <rect x="0" y="0" width="16" height="80" rx="2" fill="url(#headerPlastic)" stroke="#111" strokeWidth="0.5" filter="url(#shadowMedium)" />
        {/* Pin Holes */}
        {[4, 14, 24, 34, 44, 54].map((y) => (
          <g key={`ana-${y}`}>
            <rect x="3" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
            <rect x="10" y={y} width="3" height="3" rx="0.5" fill="url(#metalGold)" stroke="#aa8830" strokeWidth="0.3" />
          </g>
        ))}
        {/* Labels */}
        <text x="8" y="-6" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A0</text>
        <text x="8" y="6" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A1</text>
        <text x="8" y="16" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A2</text>
        <text x="8" y="26" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A3</text>
        <text x="8" y="36" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A4</text>
        <text x="8" y="46" textAnchor="middle" fill="#dff3fb" fontSize="6.5" fontFamily="monospace">A5</text>
      </g>
      <text x="438" y="350" textAnchor="middle" fill="#88c8a0" fontSize="6" fontWeight="500">ANALOG IN</text>

      {/* ===== ARDUINO LOGO ===== */}
      <g transform="translate(250, 310)">
        <text x="0" y="-8" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" letterSpacing="2.5" fontStyle="italic">ARDUINO</text>
        <text x="0" y="-1" textAnchor="middle" fill="#bfe6f5" fontSize="6" opacity="0.7">TM</text>
        
        <ellipse cx="0" cy="14" rx="46" ry="16" fill="#fff" filter="url(#shadowSmall)" />
        <text x="0" y="19" textAnchor="middle" fill="#0e6690" fontSize="16" fontWeight="800" letterSpacing="1">UNO</text>
        
        <text x="0" y="40" textAnchor="middle" fill="#bfe6f5" fontSize="6.5" opacity="0.8" letterSpacing="0.5">MADE IN ITALY</text>
      </g>

      {/* ===== INTERACTIVE PIN HIT AREAS ===== */}
      {pins.map((pin) => {
        const pos = getPinPosition(pin.name)
        // If we have a mapped position, create a copy of the pin with updated coordinates
        let updatedPin = pin
        if (pos) {
          updatedPin = { ...pin, x: pos.x, y: pos.y }
        }
        // If no mapping, we still pass the original pin (it may have its own x/y from the parent)
        return (
          <PinHitArea
            key={pin.id}
            pin={updatedPin}
            componentId={component.id}
            onClick={() => onPinClick(pin.id)}
            onPointerDown={(e) => onPinPointerDown(pin.id, e)}
          />
        )
      })}
    </g>
  )
}

export const ArduinoUnoRenderer = memo(ArduinoUnoRendererInner)