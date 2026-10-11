"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

const BOARD_STYLE: Record<string, { label: string; color: string; chip: string; subtitle: string }> = {
  "arduino-nano": { label: "NANO", color: "#167b55", chip: "ATMEGA328P", subtitle: "5V • 16 MHz" },
  "arduino-mega": { label: "MEGA 2560", color: "#167b55", chip: "ATMEGA2560", subtitle: "5V • 16 MHz" },
  "nodemcu-esp8266": { label: "NodeMCU", color: "#17634f", chip: "ESP8266EX", subtitle: "Wi-Fi • 3.3V" },
  "esp32-c3": { label: "ESP32-C3", color: "#17634f", chip: "ESP32-C3", subtitle: "Wi-Fi + BLE • 3.3V" },
  "stm32-blue-pill": { label: "BLUE PILL", color: "#1766b1", chip: "STM32F103C8T6", subtitle: "ARM Cortex-M3" },
  "stm32-black-pill": { label: "BLACK PILL", color: "#252b34", chip: "STM32F411CEU6", subtitle: "ARM Cortex-M4" },
  "raspberry-pi-pico": { label: "RASPBERRY PI PICO", color: "#16845b", chip: "RP2040", subtitle: "Dual-core ARM • 3.3V" },
  "raspberry-pi-5": { label: "RASPBERRY PI 5", color: "#176b4c", chip: "BCM2712", subtitle: "Quad-core ARM • 40-pin GPIO" },
}

const BOARD_ARTWORK: Record<string, { src: string; rotate?: boolean }> = {
  "arduino-nano": { src: "/third-party/velxio/arduino-nano.svg", rotate: true },
  "arduino-mega": { src: "/third-party/velxio/arduino-mega.svg", rotate: true },
  "esp32-c3": { src: "/third-party/velxio/esp32-c3.svg" },
  "stm32-blue-pill": { src: "/third-party/velxio/stm32-bluepill.svg" },
  "stm32-black-pill": { src: "/third-party/velxio/stm32-blackpill.svg" },
  "raspberry-pi-pico": { src: "/third-party/velxio/pi-pico.svg" },
}

function displayPinName(name: string) {
  return name.replace(/_\d+$/, "")
}

function BoardExpansionRendererInner({ component, pins, selected, simulation, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const style = BOARD_STYLE[component.type] ?? { label: component.name.toUpperCase(), color: "#176b4c", chip: "MCU", subtitle: "SolderHub board" }
  const width = Math.max(...pins.map(pin => pin.x)) + 9
  const height = Math.max(...pins.map(pin => pin.y)) + 12
  const artwork = BOARD_ARTWORK[component.type]
  const isPiHeader = component.type === "raspberry-pi-5"
  const body = { x: isPiHeader ? 12 : 25, y: isPiHeader ? 26 : 12, w: isPiHeader ? width - 24 : width - 50, h: isPiHeader ? height - 38 : height - 24 }
  const ledPin = pins.find(p => ["D13", "LED", "IO2", "GPIO2", "GP25", "PC13"].includes(p.name))
  const ledOn = ledPin ? ["HIGH", "PWM"].includes(simulation?.pinStates[ledPin.id]?.state ?? "") : false

  return (
    <g data-component-id={component.id}>
      {selected && <rect x="-5" y="-5" width={width + 10} height={height + 10} rx="12" fill="none" stroke="var(--color-primary)" strokeWidth="2" />}
      {artwork && (artwork.rotate
        ? <g transform={`translate(${width}, 0) rotate(90)`}><image href={artwork.src} x="0" y="0" width={height} height={width} preserveAspectRatio="none" /></g>
        : <image href={artwork.src} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />)}
      {!artwork && <>
        <rect x={body.x} y={body.y} width={body.w} height={body.h} rx="12" fill={style.color} stroke="#0b352c" strokeWidth="2" />
        <rect x={body.x + 7} y={body.y + 7} width={body.w - 14} height={body.h - 14} rx="8" fill="none" stroke="#8bd2b3" strokeOpacity=".24" />
        {component.type === "nodemcu-esp8266" && <>
          <rect x={width / 2 - 27} y={body.y - 1} width="54" height="20" rx="3" fill="#b7c1c8" stroke="#59636b" />
          <rect x={width / 2 - 17} y={body.y + 3} width="34" height="10" rx="2" fill="#313942" />
        </>}
        {isPiHeader && <>
          <rect x={body.x + 38} y={body.y + 46} width="112" height="75" rx="5" fill="#20292d" stroke="#64746e" />
          <text x={body.x + 94} y={body.y + 88} fontSize="11" textAnchor="middle" fill="#e5ece8">BCM2712</text>
          <rect x={body.x + body.w - 42} y={body.y + 24} width="25" height="40" rx="3" fill="#c4cbd0" />
          <rect x={body.x + body.w - 42} y={body.y + 72} width="25" height="40" rx="3" fill="#c4cbd0" />
          <rect x={body.x + body.w - 42} y={body.y + 120} width="25" height="40" rx="3" fill="#c4cbd0" />
        </>}
        {!isPiHeader && <>
          <rect x={width / 2 - 47} y={body.y + body.h / 2 - 32} width="94" height="64" rx="4" fill="#20292d" stroke="#9aa7a2" strokeWidth="2" />
          <rect x={width / 2 - 37} y={body.y + body.h / 2 - 22} width="74" height="44" rx="2" fill="#333f45" />
          <text x={width / 2} y={body.y + body.h / 2 + 4} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#e6eee9">{style.chip}</text>
          <text x={width / 2} y={body.y + body.h / 2 + 18} fontSize="7" textAnchor="middle" fill="#aab9b2">SOLDERHUB</text>
        </>}
        <text x={width / 2} y={body.y + 26} fontSize={isPiHeader ? 13 : 11} fontWeight="bold" textAnchor="middle" fill="#f0f8f3" letterSpacing="1">{style.label}</text>
        <text x={width / 2} y={body.y + 40} fontSize="7.5" textAnchor="middle" fill="#d0e7db">{style.subtitle}</text>
        <circle cx={width / 2 - 12} cy={body.y + body.h - 16} r="4" fill={ledOn ? "#70ff9a" : "#193b2c"} stroke="#a8d8bc" strokeWidth=".8" />
        <circle cx={width / 2 + 2} cy={body.y + body.h - 16} r="4" fill="#f7a54b" stroke="#f4d6a8" strokeWidth=".8" />
      </>}
      {pins.map(pin => {
        const left = pin.x < width / 2
        const horizontal = isPiHeader && pin.y < height / 2
        const labelX = horizontal ? pin.x : left ? pin.x + 12 : pin.x - 12
        const labelY = horizontal ? pin.y + 14 : pin.y + 3
        return <g key={pin.id}>
          <circle cx={pin.x} cy={pin.y} r="5.4" fill="#d4d9d2" stroke="#69766f" strokeWidth="1.2" />
          <circle cx={pin.x} cy={pin.y} r="2.5" fill="#25352f" />
          <text x={labelX} y={labelY} fontSize={pins.length > 45 ? 6.4 : 7.5} textAnchor={horizontal ? "middle" : left ? "start" : "end"} fill={artwork ? "#111827" : "#f4e5ad"} stroke={artwork ? "#fff" : "none"} strokeWidth={artwork ? ".6" : "0"} paintOrder="stroke" fontFamily="ui-monospace, monospace">{displayPinName(pin.name)}</text>
          <PinHitArea pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={e => onPinPointerDown(pin.id, e)} radius={5.4} />
        </g>
      })}
    </g>
  )
}

export const BoardExpansionRenderer = memo(BoardExpansionRendererInner)
