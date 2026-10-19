# ESP32 firmware integration: verified findings (2026-10-18)

Status: **groundwork only. No ESP32 firmware is compiled or executed by SolderHub yet.** This document records what was verified against the code and upstream sources so the next steps are built on facts. Nothing below should be read as "ESP32 simulation works".

## 1. What exists on `main` (after PR #69 / #70)

- Pure adapters: `board-adapter.ts` (header label to GPIO), `gpio-canvas-adapter.ts`, `gpio-runtime-adapter.ts`, `bridge-protocol.ts`, `bridge-transport.ts`, with unit tests.
- `Esp32WindowBridgeRunner`: an opt-in listener for a trusted iframe. Not mounted anywhere.
- `/esp32-lab`: a cross-origin iframe of the upstream hosted page. Not connected to the canvas.
- `/api/compile`: AVR (`arduino:avr:uno`) only.
- No ESP32 compiler, no ESP32 runtime, no ESP32 built-in project.

## 2. Gaps found in the existing canvas data path (fixed in this change)

1. **The engine never drove nets from ESP32 boards.** `driveNets` injected power, ground and OUTPUT-pin drivers only for `arduino-uno`. An LED wired to an ESP32 DevKit pin could not light regardless of what firmware did. ESP32 DevKit and ESP32-C3 now drive nets at 3.3 V logic (5V/VIN rails stay 5 V). The Uno path is unchanged.
2. **GPIO events did not set `pinModes`.** `simulateArduino` and the engine only drive a pin whose mode is `"OUTPUT"`; the bridge runner wrote only `pinValues`, so only the DevKit's default `IO2` could ever work. The runtime adapter now records every firmware-driven pin as `OUTPUT` and reports a combined `{pinModes, pinValues}` state.
3. **Metadata handling.** `UPDATE_METADATA` is a shallow merge, so the runner now writes only `pinModes`/`pinValues`, starts from a clean slate while firmware owns the pins, and restores the board's prior pin state when it stops. Other metadata keys are untouched (covered by a test).

## 3. Upstream emulator: `mikroverk/esp32sim` @ `142805d`

- License: MIT. Chips in the wasm ABI: classic ESP32 (`esp32`), ESP32-S3, ESP32-C3, ESP32-C6. Upstream rates S3 mature and C3/C6 draft.
- The browser ABI (`wasm/src/lib.rs`) drains the WebSocket-protocol JSON/binary outbox. That protocol has **no outbound GPIO message**: only `serial`, `ring`, `stat` (including `gpio_in`, host-driven input), display and audio frames. The earlier finding is confirmed.
- The SoC models do produce GPIO output edges and hand them to a Rust `BoardModel` (`gpio_changes`, `gpio_output_at`). The bare `esp32dev` board is `NoBoard`, which returns `uses_gpio_edges() == false`. A small upstream-style change (a board that records edges and emits `{"t":"gpio","pin":N,"level":L}` through the outbox) is feasible but **has not been written or built**.
- Booting needs the mask ROM ELFs (Apache-2.0, `espressif/esp-rom-elfs`, pinned by SHA-256 in upstream `tools/fetch-rom-elfs.sh`). Upstream's classic example firmware is built with PlatformIO/pioarduino (bootloader, partitions, app at 0x10000).

## 4. Compile service: open decision

Arduino-ESP32 compilation needs the ESP32 core plus the Xtensa/RISC-V toolchains (hundreds of MB), which do not fit a normal Vercel Function. Candidates, not yet chosen or tested: a Vercel Sandbox restored from a snapshot containing the toolchain (no VPS), or precompiled artifacts for built-in examples. Whichever is chosen needs auth, quotas, size and time limits.

## 5. Not verified, and why

The authoring sandbox could not reach `static.rust-lang.org` (no `wasm32` target, so the WASM module could not be built), nor the PlatformIO/Espressif/GitHub-release hosts (no toolchain, no ROMs). Therefore compilation, firmware execution and visible LED blinking are **unverified**. The proposed place for that evidence is a CI workflow that builds the pinned emulator, compiles a Blink sketch per chip and asserts GPIO edges.

## 6. Board-support statement

No ESP32 board is currently supported for firmware simulation. SolderHub has canvas components for the classic ESP32 DevKit and the ESP32-C3 DevKitM-1 only; ESP32-S3 and ESP32-C6 would additionally need new board components and pin maps. The DevKitC V4 art used here has no user LED, so the Blink project must wire an external LED rather than rely on `LED_BUILTIN`; the actual `LED_BUILTIN` pin depends on the selected Arduino board variant and must be confirmed against the core's `pins_arduino.h` per variant before documenting it.
