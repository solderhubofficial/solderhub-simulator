import type { SimulatorProject } from "./projects"

/**
 * "Blink an LED" with a real external circuit, matching the SolderHub guide
 * "Getting Started with Arduino Uno R3 -- LED Blink Guide": Arduino Uno pin 9
 * drives an LED through a 220 ohm resistor, and the LED's other leg goes back
 * to GND.
 *
 *   D9 --[220 ohm]--|>|-- GND
 *
 * There is deliberately no pre-built hex: the sketch below is compiled on load
 * (via /api/compile, the same avr-gcc pipeline the code editor uses) and the
 * result runs on the emulated ATmega328P. So what the reader sees in the
 * article is exactly what runs -- including the Serial.println output.
 */
export const BLINK_LED_SOURCE = `// -- Arduino Uno R3 - External LED Blink ------------------------------------
// Blinks an LED on pin 9 with a configurable period.
// Modify ON_MS and OFF_MS to change the flash pattern.
// ---------------------------------------------------------------------------

#define LED_PIN   9       // Digital pin connected to LED anode (via 220 ohm)
#define ON_MS    500      // How long the LED stays on  (milliseconds)
#define OFF_MS   500      // How long the LED stays off (milliseconds)

void setup() {
  // Tell the ATmega this pin should drive current (output mode)
  pinMode(LED_PIN, OUTPUT);

  // Optional: open Serial so you can watch the blink count in the monitor
  Serial.begin(9600);
  Serial.println("Blink sketch started");
}

void loop() {
  // HIGH drives the pin to 5V -> current flows -> LED lights up
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(ON_MS);

  // LOW pulls the pin to 0V -> no current -> LED off
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(OFF_MS);
}`

export const BLINK_LED_PROJECT: SimulatorProject = {
  id: "blink-led",
  name: "Blink an LED (Uno + resistor + LED)",
  description:
    "An external LED on pin 9 through a 220 \u03a9 resistor, blinking from the guide's sketch compiled and run on a simulated ATmega328P.",
  board: "arduino-uno",
  source: BLINK_LED_SOURCE,
  buildLog: ["Compiling sketch for arduino:avr:uno..."],
  circuit: {
    board: "uno",
    parts: [
      // Start with no pin driven; the firmware's own pinMode()/digitalWrite()
      // set the direction and level (see FirmwareRunner).
      { key: "uno", type: "arduino-uno", x: 60, y: 150, metadata: { pinModes: {}, pinValues: {} } },
      { key: "resistor", type: "resistor", x: 180, y: 60, metadata: { resistance: 220, unit: "\u03a9" } },
      { key: "led", type: "led", x: 580, y: 70, metadata: { color: "red" } },
    ],
    wires: [
      // D9 -> resistor
      { from: ["uno", "D9"], to: ["resistor", "A"], color: "#f59e0b" },
      // resistor -> LED anode (long leg)
      { from: ["resistor", "B"], to: ["led", "anode"], color: "#f59e0b" },
      // LED cathode (short leg) -> GND
      { from: ["led", "cathode"], to: ["uno", "GND1"], color: "#1f2937" },
    ],
  },
}
