# SolderHub Simulator

[![CI](https://github.com/solderhubofficial/solderhub-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/solderhubofficial/solderhub-simulator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Good first issues](https://img.shields.io/github/issues/solderhubofficial/solderhub-simulator/good%20first%20issue)](https://github.com/solderhubofficial/solderhub-simulator/labels/good%20first%20issue)
![Open Source Helpers](https://www.codetriage.com/solderhubofficial/solderhub-simulator/badges/users.svg) 

An interactive, browser-based circuit simulator for Arduino and ESP32 —
drag components onto a canvas, wire them up, and run a live simulation.
No installs, no accounts, nothing to flash.

This is the simulator that powers **[solderhub.com/simulator](https://solderhub.com/simulator)**,
extracted here as a standalone, open-source project. Built for the maker
community documented at **[solderhub.com](https://solderhub.com)** — Arduino,
ESP32, Raspberry Pi, and STM32 pinouts, wiring guides, and tutorials.

<!--
  TODO: drop a short GIF/screenshot here before announcing anywhere —
  this is the single biggest lever for first-impression clicks.
  Suggested capture: drag Arduino Uno -> LED -> wire D13 to anode,
  GND to cathode -> hit Run -> LED lights up. Keep it under ~10s.
-->
![SolderHub Simulator demo](./docs/demo.gif)

**[→ Live demo](https://solderhub-simulator.vercel.app/)** &nbsp;·&nbsp; **[Contributing guide](./CONTRIBUTING.md)**

## What it does

- Drag Arduino Uno / ESP32 DevKit boards, a breadboard, LEDs, resistors,
  push buttons, a potentiometer, a buzzer, and a relay module onto a canvas
- Wire pins together by dragging between them
- Hit **Run** and watch the circuit react — LEDs light up, buzzers indicate
  activity, relay contacts switch — driven by a small net-based simulation
  engine (union-find over wires + component internals, each component
  computes its own state from the voltages on its pins)
- Every component is rendered as real SVG artwork (not icons) — the same
  renderer is reused at small scale for the component palette thumbnails

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Vitest

No backend, no database, no auth — it's a fully client-side canvas app.

## Getting started

```bash
git clone https://github.com/solderhubofficial/solderhub-simulator.git
cd solderhub-simulator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run typecheck   # tsc --noEmit
npm run test         # vitest
```

## Project layout

```
components/simulator/     UI: toolbar, sidebars, canvas, per-component SVG renderers
lib/simulator/             Engine: registry, reducer, net-resolution engine, per-component definitions
hooks/simulator/            React state/context, viewport (pan/zoom), wire-drawing interaction
types/simulator/            Shared TypeScript types
__tests__/                  Vitest tests
```

Each component (LED, resistor, relay, …) is self-contained: one
`lib/simulator/components/<type>/definition.ts` (pins, electrical behavior)
paired with one `components/simulator/components/<type>/renderer.tsx` (SVG
artwork), registered in `lib/simulator/registry.ts`. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the full walkthrough of adding a
new one.

## Where this is headed

The simulation engine is currently digital-only (HIGH/LOW voltages, no
Ohm's-law current calculation). The biggest open area for contribution is
making it electrically realistic — see the issue tracker for specifics
like PWM/`analogWrite` support and current-based LED brightness.

## License

MIT — see [LICENSE](./LICENSE).
