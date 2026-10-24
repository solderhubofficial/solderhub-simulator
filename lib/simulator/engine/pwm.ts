import type { PinVoltage } from "@/types/simulator"

/** A PWM signal measured on a microcontroller pin: fraction of time HIGH and its repeat rate. */
export interface PwmSignal {
  duty: number
  frequencyHz: number
}

/**
 * The voltage-level engine only knows HIGH/LOW. A pin that firmware drives with PWM stays "HIGH" there and its
 * duty/frequency travel alongside in this side table, keyed by the pin-voltage object the engine hands to each part.
 */
const signals = new WeakMap<object, Record<string, PwmSignal>>()

export function attachPwm(pinVoltages: Record<string, PinVoltage>, byPinId: Record<string, PwmSignal>): void {
  signals.set(pinVoltages, byPinId)
}

export function pwmOnPin(pinVoltages: Record<string, PinVoltage>, pinId: string | undefined): PwmSignal | null {
  if (!pinId) return null
  return signals.get(pinVoltages)?.[pinId] ?? null
}

/** Servo pulse width in µs for a PWM signal, or null when it is not a ~50 Hz servo-style signal. */
export function servoPulseMicroseconds(signal: PwmSignal | null): number | null {
  if (!signal || signal.frequencyHz < 30 || signal.frequencyHz > 100) return null
  return (signal.duty / signal.frequencyHz) * 1_000_000
}

/** Arduino Servo library default: 0° = 544 µs, 180° = 2400 µs. */
export function servoAngleFromPulse(pulseUs: number): number {
  return Math.round(Math.min(180, Math.max(0, ((pulseUs - 544) / (2400 - 544)) * 180)))
}

/** Makes the PWM table of `from` visible to a per-part copy of the pin voltages. */
export function carryPwm(from: Record<string, PinVoltage>, to: Record<string, PinVoltage>): void {
  const table = signals.get(from)
  if (table) signals.set(to, table)
}
