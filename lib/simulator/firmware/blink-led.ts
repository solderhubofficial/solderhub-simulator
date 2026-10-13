import { BLINK_BUILD_LOG, BLINK_HEX } from "./blink"
import type { SimulatorProject } from "./projects"

/**
 * "Blink an LED" with a real external circuit: Arduino Uno pin 13 drives an
 * LED through a 220 Ω current-limiting resistor, and the LED's other leg goes
 * back to GND.
 *
 *   D13 ──[220 Ω]──▶|── GND
 *
 * The firmware is the same real AVR image as the plain `blink` demo (it
 * toggles PB5 = D13 every 500 ms and runs on the avr8js ATmega328P), so the
 * LED here is driven by actual compiled code, not a scripted animation. The
 * sketch shown to the reader is the Arduino-language equivalent of that
 * image.
 */
export const BLINK_LED_SOURCE = `// Blink an external LED on pin 13 (through a 220 ohm resistor).
const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH); // LED on
  delay(500);
  digitalWrite(LED_PIN, LOW);  // LED off
  delay(500);
}`

export const BLINK_LED_PROJECT: SimulatorProject = {
  id: "blink-led",
  name: "Blink an LED (Uno + resistor + LED)",
  description:
    "An external LED on pin 13 through a 220 Ω resistor, blinking from real firmware running on a simulated ATmega328P.",
  board: "arduino-uno",
  hex: BLINK_HEX,
  source: BLINK_LED_SOURCE,
  buildLog: BLINK_BUILD_LOG,
  circuit: {
    board: "uno",
    parts: [
      { key: "uno", type: "arduino-uno", x: 60, y: 150 },
      { key: "resistor", type: "resistor", x: 180, y: 60, metadata: { resistance: 220, unit: "Ω" } },
      { key: "led", type: "led", x: 580, y: 70, metadata: { color: "red" } },
    ],
    wires: [
      // D13 → resistor
      { from: ["uno", "D13"], to: ["resistor", "A"], color: "#f59e0b" },
      // resistor → LED anode (long leg)
      { from: ["resistor", "B"], to: ["led", "anode"], color: "#f59e0b" },
      // LED cathode (short leg) → GND
      { from: ["led", "cathode"], to: ["uno", "GND1"], color: "#1f2937" },
    ],
  },
}
