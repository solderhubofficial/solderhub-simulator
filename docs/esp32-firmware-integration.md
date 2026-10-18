# ESP32 firmware integration: implementation boundary

## Current state

`/esp32-lab` embeds the upstream MIT-licensed `mikroverk/esp32sim` browser build. This is intentionally an isolated lab, not a claim that ESP32 firmware is running against SolderHub's canvas circuit. The current SolderHub `/api/compile` route compiles only `arduino:avr:uno`; do not send ESP32 sketches to it.

## Why the iframe cannot drive canvas components yet

The upstream emulator's browser glue exposes `window.EmuLink` inside its own origin and exchanges events with its Web Worker. Because SolderHub embeds it cross-origin, SolderHub cannot read that global or directly observe its worker messages. Adding a `window.postMessage` listener only on the SolderHub side would not create a GPIO bridge; the upstream page must deliberately expose a documented, origin-checked message API, or be built and hosted as same-origin assets.

The upstream web protocol does include a `gpio` input message (`pin`, `level`) for supported board models, but that protocol is not automatically available to the parent page. Also, the upstream page's demo boards are not SolderHub's ESP32 DevKit pin layout, so pin numbering and supported peripheral semantics must be mapped explicitly.

## Recommended implementation sequence

1. **Vendor or fork a pinned upstream revision** and build its WebAssembly artifacts in CI. Keep emulator source and license notices; do not fetch mutable `main` assets at runtime.
2. **Audit every redistributed asset**. The emulator is MIT, but its README says ROM ELFs and demo firmware are separately licensed/downloaded assets. Do not commit assets without checking their individual licenses and redistribution rights.
3. **Define a narrow bridge contract** between the hosted emulator and SolderHub: boot state, UART output, GPIO output changes, GPIO input injection, reset, and stop. A first versioned payload validator now lives in `lib/simulator/esp32/bridge-protocol.ts`, with unit tests in `lib/simulator/esp32/bridge-protocol.test.ts`. It is not wired to the iframe yet. The eventual listener must validate `event.origin`, `event.source`, schema, pin ranges, message rate, and payload size. Do not allow arbitrary parent messages to invoke emulator commands.
4. **Build a SolderHub board adapter** for the actual ESP32 DevKit pin map. Map GPIO numbers to SolderHub's component pins, and bridge supported digital input/output first. Add PWM, ADC, I2C, SPI and UART only with explicit semantics and tests. Never imply every sensor works merely because CPU emulation boots.
5. **Choose compilation separately from execution.** Arduino-ESP32 compilation needs the matching ESP32 toolchain/core and libraries. Vercel Functions are not a good place to download/install a large toolchain on each invocation; a browser-side compiler or a separately managed build service may be more suitable. A remote build endpoint needs authentication, quotas, source-size limits, timeouts, cache keys, and abuse protection before public exposure.
6. **Add automated checks** for message validation, pin mapping, bridge events, and a known firmware fixture for each supported SoC. Add browser smoke tests for boot, reset, mobile layout, and one end-to-end pin-driven component before marking the feature production-ready.

## Initial support target

Use the upstream emulator's documented SoC support as a ceiling, not as a promise that every SolderHub board works:

- Classic ESP32: primary first target; validate the exact SoC/peripheral support in the pinned revision.
- ESP32-S3: mature upstream target, but still requires a SolderHub board adapter.
- ESP32-C3 and ESP32-C6: upstream describes these as draft/less mature in parts of the project; treat them as experimental until firmware fixtures pass.

Do not list ESP32-CAM, ESP32-WROOM/DevKit variants, or arbitrary third-party boards as fully simulated until their board pin maps and required peripherals are tested.

## Deployment constraints

- Keep emulator execution in the browser/Web Worker where possible to avoid a continuously running VPS.
- Host pinned WASM and approved assets as static files/CDN assets; avoid building a large emulator binary as part of each user request.
- Keep the existing Uno/AVR execution path independent so an ESP32 experiment cannot regress it.
- Clearly label unsupported peripherals and compile failures in the UI; never silently fall back to Uno compilation for an ESP32 board.
