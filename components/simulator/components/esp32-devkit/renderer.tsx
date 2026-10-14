"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"
import { VelxioBoardArt } from "@/components/simulator/components/base/velxio-board-art"
import { getVelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

const layout = getVelxioBoardLayout("esp32-devkit")!

function Esp32DevkitRendererInner({
  component,
  pins,
  selected,
  simulation,
  onPinClick,
  onPinPointerDown,
}: ComponentRendererProps) {
  const io2On = simulation?.pinStates[pins.find((p) => p.name === "IO2")?.id ?? ""]?.state === "HIGH"

  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x="-4" y="-4" width={layout.width + 8} height={layout.height + 8} rx="10" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      )}

      {/* Velxio / Wokwi ESP32-DevKitC V4 artwork; silkscreen labels are part of the art. */}
      <VelxioBoardArt layout={layout} />

      {/* GPIO2 user-LED glow. (31.1, 209.9) is the LED's centre in the art's native frame,
          i.e. where the previous landscape build drew it, mapped back through the board scale/rotation. */}
      {io2On && (() => {
        const c = layout.toBoard(31.1, 209.9)
        return <circle cx={c.x} cy={c.y} r={5} fill="#50FA7B" opacity="0.92" stroke="#D8FFE2" strokeWidth={1} />
      })()}

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
