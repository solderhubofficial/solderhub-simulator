# SolderHub Simulator

[![CI](https://github.com/solderhubofficial/solderhub-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/solderhubofficial/solderhub-simulator/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](./LICENSE)
[![Good first issues](https://img.shields.io/github/issues/solderhubofficial/solderhub-simulator/good%20first%20issue)](https://github.com/solderhubofficial/solderhub-simulator/labels/good%20first%20issue)
![Open Source Helpers](https://www.codetriage.com/solderhubofficial/solderhub-simulator/badges/users.svg) 

An interactive, browser-based circuit simulator for Arduino and ESP32 —
drag components onto a canvas, wire them up, and run a live simulation.
No installs, no accounts, nothing to flash.

This is the simulator that powers **[simulator.solderhub.com](https://simulator.solderhub.com)**,
extracted here as a standalone, open-source project. Built for the maker
community documented at **[solderhub.com](https://solderhub.com)** — Arduino,
ESP32, Raspberry Pi, and STM32 pinouts, wiring guides, and tutorials.

**[→ Live demo](https://simulator.solderhub.com)** &nbsp;·&nbsp; **[Contributing guide](./CONTRIBUTING.md)**

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

## Online AVR compilation

The code editor can compile Arduino Uno sketches through the Node.js `/api/compile` route. To enable it on Vercel Production, set `NEXT_PUBLIC_ENABLE_AVR_COMPILER=1` in the Production environment and redeploy. That flag enables the editor and automatically downloads the pinned Arduino CLI + `arduino:avr` core during the production build, then bundles them with the compile function. Leave it unset to keep normal builds fast and deployments small. For an explicit toolchain build (for example, a deployment test), set `VENDOR_AVR_TOOLCHAIN=1`. Preview deployments and local builds do not download the Linux-only toolchain by default.

The compiler currently targets **Arduino Uno (AVR)** only; ESP32 compilation is not supported by this endpoint. The API limits sketches to 20 KB and compile time to 15 seconds.

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

## License and source availability

This project is licensed under **GNU AGPLv3 or later**. If you run a modified version as a network service, users interacting with it remotely must be offered access to the Corresponding Source for that running version. See [LICENSE](./LICENSE), [AGPL compliance notes](./docs/AGPL-COMPLIANCE.md), and [third-party notices](./THIRD_PARTY_NOTICES.md). The source repository is available at [GitHub](https://github.com/solderhubofficial/solderhub-simulator).
