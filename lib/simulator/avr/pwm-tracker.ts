/**
 * Measures duty cycle and frequency of a digital output from its edge
 * timestamps, in CPU cycles.
 *
 * avr8js reports every pin transition but not "this pin is PWM", and the
 * simulator's net engine only sees levels. This turns a stream of
 * (cycle, level) events into a steady `{ duty, frequencyHz }` reading, which is
 * what an LED needs to dim, or a servo to pick an angle.
 *
 * It works over fixed windows: a window that saw enough rising edges is
 * classified as PWM, and anything slower (a 1 Hz blink, a steady level) is not.
 * The last completed window's reading is held until the next window closes.
 */
export interface PwmReading {
  /** Fraction of time the pin was HIGH, 0–1. */
  duty: number
  frequencyHz: number
}

export class PwmTracker {
  private lastCycle: number | null = null
  private lastHigh = false
  private windowStart = 0
  private highCycles = 0
  private risingEdges = 0
  private firstRising = 0
  private lastRising = 0
  private published: PwmReading | null = null
  private readonly windowCycles: number

  constructor(
    private readonly cpuHz: number,
    windowSeconds = 0.1,
    private readonly minRisingEdges = 3
  ) {
    this.windowCycles = Math.round(cpuHz * windowSeconds)
  }

  /** Record that the pin is now `high` at `cycle`. Call only when the level changes. */
  record(cycle: number, high: boolean): void {
    this.advance(cycle)
    if (high && !this.lastHigh) {
      if (this.risingEdges === 0) this.firstRising = cycle
      this.lastRising = cycle
      this.risingEdges += 1
    }
    this.lastHigh = high
  }

  /** The current PWM reading as of `cycle`, or null if the pin is not PWM-like. */
  sample(cycle: number): PwmReading | null {
    this.advance(cycle)
    return this.published
  }

  private advance(cycle: number): void {
    if (this.lastCycle === null) {
      this.lastCycle = cycle
      this.windowStart = cycle
      return
    }
    const elapsed = cycle - this.lastCycle
    if (elapsed > 0 && this.lastHigh) this.highCycles += elapsed
    if (elapsed > 0) this.lastCycle = cycle
    if (cycle - this.windowStart >= this.windowCycles) this.closeWindow(cycle)
  }

  private closeWindow(cycle: number): void {
    const total = cycle - this.windowStart
    if (this.risingEdges >= this.minRisingEdges && this.lastRising > this.firstRising && total > 0) {
      const periodCycles = (this.lastRising - this.firstRising) / (this.risingEdges - 1)
      this.published = {
        duty: Math.min(1, Math.max(0, this.highCycles / total)),
        frequencyHz: this.cpuHz / periodCycles,
      }
    } else {
      this.published = null
    }
    this.windowStart = cycle
    this.highCycles = 0
    this.risingEdges = 0
    this.firstRising = 0
    this.lastRising = 0
  }
}
