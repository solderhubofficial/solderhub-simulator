import type { PlacedComponent, Wire } from "@/types/simulator"

/** An HC-SR04 whose TRIG and ECHO are wired (directly or through junctions) to Arduino Uno pins. */
export interface HcSr04Link {
  componentId: string
  trigPin: string
  echoPin: string
}

const UNO_PIN = /^(D(?:1[0-3]|[0-9])|A[0-5])$/

/** Follows wires (and junction points, which are just shared pins) from `start` to the first Uno pin reached. */
function unoPinFrom(start: string, adjacency: Map<string, string[]>, unoId: string): string | null {
  const seen = new Set([start])
  const queue = [start]
  while (queue.length) {
    const current = queue.shift() as string
    if (current.startsWith(`${unoId}_`)) {
      const name = current.slice(unoId.length + 1)
      if (UNO_PIN.test(name)) return name
    }
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next) }
    }
  }
  return null
}

export function resolveHcSr04Links(components: PlacedComponent[], wires: Wire[], unoId: string): HcSr04Link[] {
  const adjacency = new Map<string, string[]>()
  const connect = (a: string, b: string) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), b])
    adjacency.set(b, [...(adjacency.get(b) ?? []), a])
  }
  for (const wire of wires) connect(wire.fromPinId, wire.toPinId)

  const links: HcSr04Link[] = []
  for (const component of components) {
    if (component.type !== "hc-sr04") continue
    const trigPin = unoPinFrom(`${component.id}_trig`, adjacency, unoId)
    const echoPin = unoPinFrom(`${component.id}_echo`, adjacency, unoId)
    if (trigPin && echoPin) links.push({ componentId: component.id, trigPin, echoPin })
  }
  return links
}

/** Echo timing of the real module, in microseconds. */
export const HC_SR04_RESPONSE_DELAY_US = 450
export const HC_SR04_MIN_TRIGGER_US = 8
export const HC_SR04_MAX_RANGE_CM = 400

/** Echo pulse width for a distance: ~58.3 µs per cm round trip. Null when nothing is in range. */
export function echoPulseMicroseconds(distanceCm: number): number | null {
  if (!Number.isFinite(distanceCm) || distanceCm < 2 || distanceCm > HC_SR04_MAX_RANGE_CM) return null
  return Math.round(distanceCm * 58.31)
}
