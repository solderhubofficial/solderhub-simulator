"use client"

import { memo } from "react"
import type { ComponentRendererProps } from "@/types/simulator"
import { PinHitArea } from "@/components/simulator/components/base/pin-hit-area"

// Artwork from Wokwi's MIT-licensed @wokwi/elements (the DHT11 is the same part recoloured blue);
// see THIRD_PARTY_NOTICES.md. The art is 15.1 x 30.885 mm at 3.7795 px/mm.
const ART_WIDTH = 57.07
const ART_HEIGHT = 116.73

/** Real-looking DHT11 / DHT22 sensor. Its pins are the leads at the bottom: VCC, DATA, (NC), GND. */
function Dht11RendererInner({ component, pins, selected, onPinClick, onPinPointerDown }: ComponentRendererProps) {
  const src = component.type === "dht22" ? "/third-party/wokwi/dht22.svg" : "/third-party/wokwi/dht11.svg"
  return (
    <g data-component-id={component.id}>
      {selected && (
        <rect x={-3} y={-3} width={ART_WIDTH + 6} height={ART_HEIGHT + 6} rx={5} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      )}
      <image href={src} x={0} y={0} width={ART_WIDTH} height={ART_HEIGHT} preserveAspectRatio="none" />
      {pins.map((pin) => (
        <PinHitArea key={pin.id} pin={pin} componentId={component.id} onClick={() => onPinClick(pin.id)} onPointerDown={(event) => onPinPointerDown(pin.id, event)} radius={3} />
      ))}
    </g>
  )
}

export const Dht11Renderer = memo(Dht11RendererInner)
