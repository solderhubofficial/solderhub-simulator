import type { ComponentSimulationResult, ComponentPin, PinState, PinVoltage, PlacedComponent } from "@/types/simulator"
import { ACTIVATION_THRESHOLD, LED_FORWARD_VOLTAGE, V_HIGH, V_LOW } from "@/lib/simulator/constants"

export function voltageToState(voltage: PinVoltage): PinState {
  if (voltage === null) return "FLOATING"
  if (voltage >= V_HIGH * 0.6) return "HIGH"
  if (voltage <= V_LOW + 0.5) return "LOW"
  return "PWM"
}

export function makePinResult(voltage: PinVoltage): { voltage: PinVoltage; state: PinState } {
  return { voltage, state: voltageToState(voltage) }
}

export function emptySimulationResult(componentId: string): ComponentSimulationResult {
  return { componentId, pinStates: {}, flags: {} }
}

export function getPinVoltage(
  pinVoltages: Record<string, PinVoltage>,
  pins: ComponentPin[],
  name: string
): PinVoltage {
  const pin = pins.find((p) => p.name === name)
  if (!pin) return null
  return pinVoltages[pin.id] ?? null
}

/** LED is ON when anode is sufficiently above cathode */
export function simulateLed(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const anode = getPinVoltage(pinVoltages, pins, "anode")
  const cathode = getPinVoltage(pinVoltages, pins, "cathode")
  const isOn =
    anode !== null &&
    cathode !== null &&
    anode - cathode >= LED_FORWARD_VOLTAGE

  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
  }

  return {
    componentId: component.id,
    pinStates,
    flags: { isOn },
  }
}

/** Buzzer active when voltage across pins exceeds threshold */
export function simulateBuzzer(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const pos = getPinVoltage(pinVoltages, pins, "positive")
  const neg = getPinVoltage(pinVoltages, pins, "negative")
  const isActive =
    pos !== null &&
    neg !== null &&
    Math.abs(pos - neg) >= ACTIVATION_THRESHOLD

  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
  }

  return {
    componentId: component.id,
    pinStates,
    flags: { isActive },
  }
}

/** Relay coil energized drives contact state */
export function simulateRelay(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const coilPos = getPinVoltage(pinVoltages, pins, "coil+")
  const coilNeg = getPinVoltage(pinVoltages, pins, "coil-")
  const isEnergized =
    coilPos !== null &&
    coilNeg !== null &&
    coilPos - coilNeg >= ACTIVATION_THRESHOLD

  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
  }

  return {
    componentId: component.id,
    pinStates,
    flags: { isEnergized },
  }
}

/** Resistor passes through — no behavioral flags */
export function simulatePassive(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
  }
  return { componentId: component.id, pinStates, flags: {} }
}

/** Potentiometer wiper outputs scaled voltage */
export function simulatePotentiometer(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const position = typeof component.metadata.position === "number"
    ? Math.min(1, Math.max(0, component.metadata.position))
    : 0.5

  const gnd = getPinVoltage(pinVoltages, pins, "gnd")
  const vcc = getPinVoltage(pinVoltages, pins, "vcc")
  const wiperPin = pins.find((p) => p.name === "wiper")

  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    if (pin.name === "wiper" && gnd !== null && vcc !== null) {
      const wiperVoltage = gnd + (vcc - gnd) * position
      pinStates[pin.id] = makePinResult(wiperVoltage)
    } else {
      pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
    }
  }

  return {
    componentId: component.id,
    pinStates,
    flags: { position },
  }
}

/** Push button — pressed state is metadata-driven */
export function simulatePushButton(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const pressed = component.metadata.pressed === true
  const pinStates: ComponentSimulationResult["pinStates"] = {}
  for (const pin of pins) {
    pinStates[pin.id] = makePinResult(pinVoltages[pin.id] ?? null)
  }
  return {
    componentId: component.id,
    pinStates,
    flags: { pressed },
  }
}

/** Arduino — reflect configured output pin values */
export function simulateArduino(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  const pinStates: ComponentSimulationResult["pinStates"] = {}
  const pinModes = (component.metadata.pinModes ?? {}) as Record<string, string>
  const pinValues = (component.metadata.pinValues ?? {}) as Record<string, number>

  for (const pin of pins) {
    const driven = pinVoltages[pin.id]
    if (driven !== null && driven !== undefined) {
      pinStates[pin.id] = makePinResult(driven)
    } else if (pinModes[pin.name] === "OUTPUT") {
      const val = pinValues[pin.name] ?? 0
      pinStates[pin.id] = makePinResult(val >= 1 ? V_HIGH : V_LOW)
    } else {
      pinStates[pin.id] = makePinResult(null)
    }
  }

  return {
    componentId: component.id,
    pinStates,
    flags: {},
  }
}

/** Breadboard — no special visual flags */
export function simulateBreadboard(
  component: PlacedComponent,
  pins: ComponentPin[],
  pinVoltages: Record<string, PinVoltage>
): ComponentSimulationResult {
  return simulatePassive(component, pins, pinVoltages)
}
