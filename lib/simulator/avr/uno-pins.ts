/**
 * Arduino Uno (ATmega328P) pin map: board pin name → AVR port + bit.
 *
 *   D0–D7   → PORTD bits 0–7
 *   D8–D13  → PORTB bits 0–5
 *   A0–A5   → PORTC bits 0–5 (also ADC channels 0–5)
 */
export type AvrPortName = "B" | "C" | "D"

export interface PinLocation {
  port: AvrPortName
  bit: number
}

const locations: Record<string, PinLocation> = {}

for (let bit = 0; bit < 8; bit++) locations[`D${bit}`] = { port: "D", bit }
for (let bit = 0; bit < 6; bit++) locations[`D${8 + bit}`] = { port: "B", bit }
for (let bit = 0; bit < 6; bit++) locations[`A${bit}`] = { port: "C", bit }

export const UNO_PIN_LOCATIONS: Readonly<Record<string, PinLocation>> = locations

/** Every board pin name the emulator tracks, digital first then analog. */
export const UNO_PIN_NAMES: readonly string[] = Object.keys(locations)

/** ADC channel (0–5) for an analog pin name like "A3", or null for any other pin. */
export function analogChannelForPin(name: string): number | null {
  const match = /^A([0-5])$/.exec(name)
  return match ? Number(match[1]) : null
}
