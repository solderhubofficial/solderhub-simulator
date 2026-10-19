# ESP32 build service and browser workflow

The browser cannot host the ESP32 toolchain and Vercel Functions cannot either (multi-GB core, long compiles). Compilation therefore runs in a small separate service, `esp32-build-service/`, which wraps `arduino-cli` with the `esp32:esp32` core (3.3.12 verified in CI). The Next.js route `POST /api/esp32/compile` validates the request (same-origin, size limits, source policy, per-IP rate limit, concurrency cap), forwards it with a bearer token, and sanitises the response (paths scrubbed, sizes bounded). The AVR `/api/compile` route is unchanged.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `ESP32_COMPILE_SERVICE_URL` | Next app | https URL of the build service (http allowed only for localhost). Unset: the route returns an honest 503 "unavailable". |
| `ESP32_COMPILE_SERVICE_TOKEN` | Next app | Bearer token the route sends. |
| `BUILD_TOKEN` | Build service | Same token (>= 16 chars). The service refuses to start without it. |
| `PORT`, `HOST`, `MAX_PARALLEL`, `MAX_QUEUE`, `COMPILE_TIMEOUT_MS`, `BUILD_CACHE_DIR`, `ESP32_CORE_LABEL` | Build service | Optional tuning. |
| `NEXT_PUBLIC_ESP32_RUNTIME_BASE_URL` | Next app | Optional. Base of the runtime assets; default same-origin `/esp32`. A cross-origin base needs CORS. |

## Hosting the service (trade-offs)

- **Scale-to-zero container host (Cloud Run, Fly.io Machines, Azure Container Apps)**: pay per use, cold start of a few seconds, image ~2 GB. Recommended; pre-warm via the Dockerfile's build-cache step.
- **Always-on small VPS**: simplest and predictable (~$10-20/month for 2 vCPU/4 GB) but a permanent cost and you patch it. Not set up by this PR.
- **Vercel Sandbox**: possible, but adds a paid per-compile dependency and cold toolchain installs.

Run the image non-root, read-only root filesystem with a writable tmpfs for scratch, no secrets in the environment, and egress blocked after the image is built. Sketches are untrusted code compiled, never executed, on the server; the source policy rejects absolute/parent includes, `__has_include`, `.incbin` and `.include`.

## Emulator runtime assets

The wasm emulator and ROM images are built by `scripts/esp32/build-runtime.sh public/esp32` (needs Rust). They are gitignored and must be produced in the deploy build or hosted elsewhere; a missing runtime yields a clear "runtime not deployed" error in the editor. The Worker verifies SHA-256 sums before use.

## What CI proves (PR #72)

- `blink` matrix: real arduino-cli + core -> headless emulator -> alternating GPIO edges and serial, for esp32, esp32c3, esp32s3, esp32c6.
- `build-service`: real compile of Blink and of a broken sketch (error with file/line, no path leak) for both boards.
- `browser-acceptance`: Playwright against `next start` with the real build service: import project, Compile, Run, the wired LED blinks, Stop leaves it off, Reset reboots, a compile error shows diagnostics and Run stays disabled.

## Board status

- ESP32 DevKit: **supported** (LED_BUILTIN is GPIO2; verified through the browser test).
- ESP32-C3: **experimental**. `LED_BUILTIN` is 30 (RGB pseudo-pin) in core 3.3.12; use an explicit GPIO. Browser flow not covered by the acceptance test.
- Not supported yet: PWM/LEDC, ADC, I2C, SPI, Wi-Fi/BLE, interrupts beyond what the emulator provides.

## Known limitation: saved projects

`examples/esp32/blink/blink-project.json` imports through Import/Paste JSON and loads its sketch into the editor. Creating the production "Blink" record on solderhub.com needs the owner's authenticated session and was not done here.
