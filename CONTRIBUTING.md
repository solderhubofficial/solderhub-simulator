# Contributing

Thanks for taking a look. This project is intentionally small and
self-contained — no backend, no build secrets — so you should be able to
clone it and be productive in a few minutes.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run test
```

## How the simulator works, briefly

- **State** lives in a reducer (`lib/simulator/reducer.ts`) — placed
  components, wires, viewport, selection, running/stopped.
- **Simulation** runs on every state change (`lib/simulator/engine/simulation-engine.ts`):
  it unions all connected pins into electrical "nets" using union-find
  (wires + each component's internal connections, e.g. a breadboard row),
  drives nets from sources (Arduino/ESP32 output pins, power/ground), then
  asks each component to compute its own result from the voltages on its
  pins.
- **Rendering** is plain SVG. Every placed component renders itself via its
  own `Renderer` — no shared canvas library, no icon fonts standing in for
  parts.

## Adding a new component

This is the highest-value kind of contribution and follows the same
recipe every time. Using the LED as a reference, to add e.g. a
**capacitor**:

1. **Definition** — `lib/simulator/components/capacitor/definition.ts`
   Declares pins (name, type, x/y offset), default metadata, which pin
   pairs may connect, any internal connections (most passives just pass
   through), and a `simulate()` function returning pin states + behavioral
   flags (e.g. `{ isCharged: true }`).

   ```ts
   export const capacitorDefinition: ComponentDefinition = {
     type: "capacitor",
     name: "Capacitor",
     category: "passive",
     width: 40,
     height: 50,
     pinTemplates: [
       { name: "A", type: "passive", x: 0, y: 25 },
       { name: "B", type: "passive", x: 40, y: 25 },
     ],
     defaultMetadata: { capacitance: 100, unit: "µF" },
     canConnectPins: defaultCanConnectPins,
     getInternalConnections: () => [],
     simulate: simulatePassive, // or write a custom simulate()
     Renderer: CapacitorRenderer,
   }
   ```

2. **Renderer** — `components/simulator/components/capacitor/renderer.tsx`
   Pure SVG, driven by `component`, `pins`, `selected`, and `simulation`
   props. Look at `components/simulator/components/resistor/renderer.tsx`
   for a simple passive part, or `led/renderer.tsx` for one that reacts
   to simulation state (glow when on).

3. **Register it** — one line in `lib/simulator/registry.ts`:
   ```ts
   import { capacitorDefinition } from "@/lib/simulator/components/capacitor/definition"
   // ...add to the DEFINITIONS array
   ```

That's it — the palette, canvas placement, wiring, properties panel, and
thumbnail preview all pick it up automatically from the registry; nothing
else needs to change.

## Areas that need help

- **New components** — capacitor, servo, HC-SR04 ultrasonic, DHT11/22,
  16x2 LCD, SSD1306 OLED are all good starting points and follow the
  recipe above.
- **Engine realism** — the simulation is currently digital-only (a pin is
  HIGH, LOW, or floating; no actual current is computed). The biggest gap:
  - `analogWrite`/PWM support on capable pins (currently only binary
    HIGH/LOW toggles exist in the properties panel)
  - Ohm's-law current calculation so LED brightness and resistor values
    actually matter, and a direct short (LED with no resistor) can be
    flagged instead of silently working
- **UX** — undo/redo, copy/paste, keyboard arrow-key nudge for placed
  components, multi-select
- **Tests** — `lib/simulator/reducer.ts` and the simulation engine are
  good candidates for more coverage; see `__tests__/simulator-state.test.ts`
  for the existing pattern

If you want to work on something not listed here, open an issue first to
talk it through before sinking time into a PR — especially for anything
touching the simulation engine itself.

## PR checklist

- `npm run typecheck` and `npm run test` pass
- New components follow the definition + renderer + registry pattern above
- Keep renderers dependency-free plain SVG (no new charting/canvas libraries)
