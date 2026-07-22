# Starter issues (internal — not for the repo)

Copy each block below into a new GitHub issue using the **New component**
template. Title is already in the right format. Open all of these before
announcing the repo anywhere — an empty issues tab converts nobody.

Roughly ordered easiest → hardest, so early contributors have a ramp.

---

### 1. Add component: Capacitor

**Component:** Ceramic/electrolytic capacitor (passive, 2-pin)

**Pins:** `positive` (passive), `negative` (passive)

**Behavior:** Purely passive for v1 — just passes the connection through
(same shape as the resistor's `getInternalConnections`). No charge/discharge
timing needed yet; that's a good v2 follow-up once someone wants it.

**Reference:** Model the definition + renderer after `resistor` (same
2-leg passive pattern). Real part looks like a small cylinder (electrolytic)
or a flat disc (ceramic) — pick one style.

---

### 2. Add component: Photoresistor (LDR)

**Component:** Light-dependent resistor

**Pins:** `pin1` (passive), `pin2` (passive)

**Behavior:** Passive pass-through like a resistor, but exposes a
`lightLevel` metadata slider (0–100) in the properties panel instead of a
fixed resistance — same idea as the potentiometer's `position` metadata,
just renamed.

**Reference:** Follow `potentiometer` for the metadata-driven properties
panel pattern, `resistor` for the pass-through electrical behavior.

---

### 3. Add component: RGB LED (common cathode)

**Component:** RGB LED, common-cathode, 4-pin

**Pins:** `red` (digital in), `green` (digital in), `blue` (digital in),
`cathode` (ground)

**Behavior:** Same idea as the existing LED's `simulateLed`, but computes
three independent on/off states (or PWM-driven brightness if you want to go
further) and mixes them into a single rendered color.

**Reference:** `led` definition + renderer — mostly a matter of tracking
3 input pins instead of 1 and compositing the fill color.

---

### 4. Add component: Tilt switch

**Component:** Ball tilt switch (2-pin, mechanical)

**Pins:** `pin1` (digital), `pin2` (digital)

**Behavior:** Same internal-connection pattern as the push button
(`getInternalConnections` returns a closed circuit when "tilted"), but
toggled via a metadata boolean in the properties panel rather than a
press-and-hold interaction.

**Reference:** `push-button` — copy the connection logic, simplify the
interaction to a toggle.

---

### 5. Add component: Servo motor (SG90)

**Component:** Micro servo, 3-pin (VCC, GND, Signal)

**Pins:** `vcc` (power), `gnd` (ground), `signal` (digital in)

**Behavior:** Reads the PWM-ish signal pin state and rotates a rendered
horn/arm to reflect an angle (0–180°) driven off `pinValues` on the signal
pin — doesn't need true PWM duty-cycle decoding for v1, a HIGH/LOW ratio
approximation is fine to start.

**Reference:** `relay` for the "digital in drives a visible mechanical
state" pattern; the render is the new part (rotate an SVG arm via
`transform="rotate(...)"`, same trick used in the potentiometer's knob).

---

### 6. Add component: HC-SR04 ultrasonic sensor

**Component:** HC-SR04 distance sensor, 4-pin

**Pins:** `vcc` (power), `trig` (digital in), `echo` (digital out),
`gnd` (ground)

**Behavior:** When `trig` goes HIGH, drive `echo` HIGH for a duration
proportional to a `distanceCm` metadata value (settable in the properties
panel, simulating "an object is N cm away"). No need to model actual sound
propagation timing precisely.

**Reference:** `arduino-uno`'s `simulateArduino` for the "drive an output
pin based on input pin state" pattern.

---

### 7. Add component: DHT11 temperature/humidity sensor

**Component:** DHT11, 3-pin (VCC, DATA, GND)

**Pins:** `vcc` (power), `data` (digital), `gnd` (ground)

**Behavior:** This one's mostly a UI/metadata exercise, not new engine
logic — expose `temperatureC` and `humidityPct` sliders in the properties
panel (same pattern as the potentiometer's `position`), display the current
values on the rendered SVG. The single-wire DHT protocol itself is out of
scope for v1 — treat `data` as inert until someone wants real protocol
timing.

**Reference:** `potentiometer` for the metadata-slider pattern.

---

### 8. Add component: IR receiver (VS1838B) + remote

**Component:** 3-pin IR receiver module

**Pins:** `vcc` (power), `out` (digital out), `gnd` (ground)

**Behavior:** A "Simulate button press" button in the properties panel
pulses `out` LOW briefly (active-low, matching real VS1838B behavior) —
good first issue for someone who wants to touch the properties-panel UI
more than the simulation engine.

**Reference:** `push-button` for pulsing a pin from a UI action.

---

## After these are open

- Label all 8 `good first issue` (should already be set by the issue
  template, double check).
- Pin the "Add component" issue with the most beginner-friendly one
  (capacitor) to the top of the Issues tab.
- Once 2-3 of these get picked up, open a fresh batch — an issues tab that
  never refills looks abandoned just as fast as an empty one.
