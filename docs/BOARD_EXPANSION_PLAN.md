# Board and component expansion plan

Target board set (and only this set in the main board picker):

1. Arduino Uno
2. Arduino Mega 2560
3. Arduino Nano
4. NodeMCU ESP8266
5. ESP32 DevKit
6. ESP32-C3
7. STM32 Blue Pill
8. STM32 Black Pill
9. Raspberry Pi Pico / RP2040
10. Raspberry Pi 5

## Implementation principles

- Preserve the existing SolderHub circuit model, pin-to-pin wiring, and component definitions as the canonical application model. Treat upstream board/component metadata as an adapter, not as a second competing state model.
- Separate three capabilities in UI metadata: visual board/pin layout, electrical interaction with wires/components, and executable firmware emulation. A board must not be described as simulated merely because its SVG renders.
- Build a board registry with stable board IDs, exact pin names, board-specific pin coordinates, voltage/domain metadata where known, and renderer references. Keep GPIO labels and physical header positions grounded in the actual board revision.
- Prefer upstream-compatible reusable renderers and metadata where licensing permits. Keep SolderHub-specific pin hit targets large enough for touch input and expose accessible pin labels/tooltips.
- Reuse component models only when their behavior matches the SolderHub engine. Components without implemented electrical behavior should be explicitly marked visual-only rather than pretending to simulate.
- Maintain SolderHub's deep-navy / blue / orange visual identity while prioritizing recognizable real-board geometry and readable silkscreen labels.
- Keep board picker limited to the ten requested targets; do not automatically expose every upstream target.

## Board capability matrix

| Board | Visual + pin wiring target | Firmware execution requirement |
|---|---|---|
| Arduino Uno | Existing board; verify pin accuracy | Existing AVR toolchain/emulator |
| Mega 2560 | New renderer + full header map | AVR emulator/board-specific core |
| Nano | New compact renderer + exact pin map | AVR emulator/board-specific core |
| NodeMCU ESP8266 | New board renderer + ESP8266 pin names | ESP8266-compatible compiler/emulator; do not assume ESP32 support covers it |
| ESP32 DevKit | Existing board; retain its current 38-pin variant explicitly | Existing ESP32 build/runtime capability must be verified |
| ESP32-C3 | New renderer + C3-specific GPIO/USB/UART map | RISC-V ESP32-C3-compatible toolchain/runtime |
| STM32 Blue Pill | New renderer + STM32F103 pin map | Cortex-M3 toolchain/runtime and peripheral model |
| STM32 Black Pill | Select exact MCU/board revision before defining pins | Cortex-M4 toolchain/runtime matching selected MCU |
| Raspberry Pi Pico | New renderer + RP2040 pin map | RP2040 emulator/toolchain |
| Raspberry Pi 5 | Board/header visualization and GPIO wiring model first | Full Raspberry Pi 5 Linux/ARM virtualization is a separate major project; never imply it works unless verified |

## Component-library migration

1. Inventory every upstream component and classify it as renderer/visual, pin/wire metadata, electrical behavior, or firmware/runtime dependency.
2. Audit upstream source and each third-party asset independently. AGPL does not override MIT, CC-BY-SA, or other component-level terms.
3. Integrate in small batches, retaining attribution and a manifest for each imported file/asset.
4. Add registry tests for unique component IDs, valid dimensions, valid pin coordinates, and stable board IDs.
5. Add regression tests for wire placement, mobile touch hit areas, saved circuit compatibility, and simulation behavior.
6. Verify typecheck, lint, unit tests, production build, and a manual browser pass before deployment.

## Suggested rollout

- Phase 1: license/compliance baseline and source notice (completed on this branch).
- Phase 2: first SolderHub-native board-expansion adapter added for Nano, Mega 2560, NodeMCU ESP8266, ESP32-C3, STM32 Blue Pill, STM32 Black Pill, Pico, and Pi 5 GPIO.
- Phase 3: validate every board's pinout against its exact hardware revision; improve board-specific artwork/geometry; add registry and coordinate tests; run typecheck, lint, unit tests, and production build.
- Phase 4: selectively integrate upstream component definitions/artwork after recording per-file and per-asset provenance and licenses.
- Phase 5: only then consider the much larger Pi 5 Linux emulation work.

## Current branch status

The new board definitions are registered in SolderHub's existing component palette and use SolderHub's existing pin/wire model. The current renderer is original SolderHub vector artwork, not copied Velxio board artwork. These board entries provide visual pin wiring only; they do not add new firmware emulators. Do not deploy until pin maps and CI are verified.