import { PinState, type AVRIOPort } from "avr8js"

export type PinMode = "OUTPUT" | "INPUT"

export interface PortSnapshot {
  /** Logic level per board pin name (true = HIGH). Pull-ups read HIGH. */
  levels: Record<string, boolean>
  /** Direction per board pin name, from the DDR register. */
  modes: Record<string, PinMode>
}

/**
 * Reads the live level and direction of every pin on one AVR port, keyed by
 * Arduino pin name (`names[bit]`).
 *
 * Direction matters: the simulator only drives a wire from a board pin when
 * that pin is an OUTPUT (see simulateArduino). Reading it from avr8js's DDR
 * state -- rather than assuming a fixed pin -- is what lets a sketch drive
 * any pin (e.g. `pinMode(9, OUTPUT)`), not only the on-board LED on D13.
 */
export function readPort(port: AVRIOPort, names: readonly string[]): PortSnapshot {
  const levels: Record<string, boolean> = {}
  const modes: Record<string, PinMode> = {}
  names.forEach((name, bit) => {
    const state = port.pinState(bit)
    levels[name] = state === PinState.High || state === PinState.InputPullUp
    modes[name] = state === PinState.Low || state === PinState.High ? "OUTPUT" : "INPUT"
  })
  return { levels, modes }
}
