# Browser-first ESP32 simulation plan

## Goal

Run supported ESP32 firmware in the user's browser so simulation CPU time is not consumed by a per-session VPS. Keep the existing SolderHub circuit model, saved-project format, component renderers, serial tools, and Vercel/Supabase deployment.

## Current baseline

- `/api/compile` invokes Arduino CLI with `arduino:avr:uno` only and returns AVR HEX.
- `FirmwareRunner` and `useAvrRunner` execute ATmega328P firmware in the browser with `avr8js`.
- The ESP32 DevKit component currently uses the shared component-level simulation engine; there is no ESP32/Xtensa/RISC-V firmware emulator connected to the Run control.
- ESP32 variants are not one target: the classic ESP32 and ESP32-S3 use Xtensa cores, while ESP32-C3 uses RISC-V. They require appropriate emulator targets and board/peripheral mappings.

## Emulator feasibility finding (2026-10-18)

The upstream `mikroverk/esp32sim` MIT WebAssembly worker is a useful candidate for browser-side CPU execution, but its current browser ABI is not yet a SolderHub GPIO runtime. The worker drains a queue of text and binary display/network messages through `esp32sim_out_*`; it does not currently expose a documented per-pin GPIO snapshot/event API that SolderHub can consume. The hosted `run.html` page is also a separate UI, so embedding it in an iframe does not connect it to SolderHub's wires or component models.

Before claiming canvas integration, the upstream runtime or a maintained fork must expose GPIO direction/level transitions (and later PWM/ADC/UART) through a bounded worker message contract. Then SolderHub can map those events to its existing component pin metadata. A successful boot/console demo alone is not proof that the virtual LED or circuit is electrically driven.

The upstream browser page expects a built `web/wasm/esp32sim.wasm` and separate ROM/demo assets. The ROM assets are fetched separately by upstream tooling and may have distinct redistribution terms; do not blindly copy the hosted page or every demo asset into this repository. Pin the upstream commit, audit each shipped asset/license, and build the wasm in CI before deploying it locally.

## Proposed architecture

1. **Keep compile and execution separate.** The compiler produces firmware artifacts; a browser-side runtime executes them. Compile service usage does not imply server-side simulation.
2. **Add a runtime adapter contract.** A runtime receives a board type, firmware artifact, virtual clock/run state, and pin/peripheral bridge; it emits GPIO/PWM/ADC/UART/I2C/SPI events and lifecycle/error events.
3. **Start with one explicit target.** Prototype a single ESP32 variant first (recommend classic ESP32 DevKit V1 because it is already a SolderHub board), then add ESP32-S3 and ESP32-C3 only when each has a compatible emulator and tests.
4. **Bridge to existing components.** Map GPIO changes into component pin metadata and connect UART to the current Serial Monitor. Add sensor/display/peripheral models incrementally; do not claim support for a peripheral until tested.
5. **Preserve fallback behavior.** Keep the current component-level preview available when firmware emulation is unsupported or disabled. Make the UI say which mode is active.
6. **Use worker isolation.** Run the emulator in a Web Worker/WASM module where possible, with bounded instruction batches, pause/resume, reset, and clean disposal. Keep the main thread responsive on mobile.
7. **Compile strategy.** Evaluate a reproducible ESP32 Arduino toolchain for producing firmware artifacts. Vercel Functions have size/runtime constraints, so do not bundle a large toolchain blindly. Prefer cached/precompiled examples for initial validation and select a compiler service only after measuring limits.
8. **Validation gates.** Before calling this real firmware simulation, test blink/GPIO, PWM/servo, UART, I2C display, SPI peripheral, reset/stop behavior, and mobile performance against known outputs. Wi-Fi/HTTP/MQTT need a separate networking bridge and must not be advertised until implemented.

## Milestones

- **M1 — feasibility spike:** select a permissively licensed, browser-compatible emulator for the chosen target; prove one firmware image can boot and toggle GPIO in a Worker.
- **M2 — SolderHub adapter:** connect emulator GPIO/UART to the existing circuit model and Serial Monitor; add automated tests.
- **M3 — board/peripheral coverage:** implement and document supported peripherals, starting with GPIO, PWM, UART, I2C, SPI.
- **M4 — compile pipeline:** add reproducible ESP32 compilation and caching, with limits and error handling.
- **M5 — beta:** enable only for the tested ESP32 target; retain AVR and component-preview behavior unchanged.

## Acceptance criteria

- ESP32 firmware executes locally in the browser after the firmware artifact is available; no server-side per-session CPU emulator is required.
- The emulator does not block the UI and stops cleanly.
- GPIO and serial outputs match reference test firmware.
- Unsupported boards/peripherals are clearly identified rather than silently simulated.
- No existing AVR behavior or saved circuit format regresses.
- Dependencies and any imported assets have license review before inclusion.
