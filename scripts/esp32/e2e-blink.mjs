// Headless end-to-end check: compiled Arduino firmware -> real emulator (wasm) -> GPIO/serial events.
// Uses the same esp32-runtime/emulator-core.mjs the browser Worker uses. No faked signals: edges come
// from the emulated CPU executing the firmware.
//   node scripts/esp32/e2e-blink.mjs --chip esp32|esp32c3|esp32s3|esp32c6 --runtime DIR --fw DIR [--pin 4] [--sketch blink]
import { readFileSync } from "node:fs"
import { createEmulatorCore, ROM_FILES } from "../../esp32-runtime/emulator-core.mjs"

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d }
const chip = arg("chip"), runtime = arg("runtime"), fw = arg("fw"), pin = Number(arg("pin", "4")), sketch = arg("sketch", "blink")
const rom = ROM_FILES[chip]
if (!rom || !runtime || !fw) { console.error("usage: --chip <esp32|esp32c3|esp32s3|esp32c6> --runtime DIR --fw DIR"); process.exit(2) }

const fail = (message, extra) => { console.error("FAIL:", message); if (extra) console.error(extra); process.exit(1) }
const read = (path) => new Uint8Array(readFileSync(path))

let core
try {
  core = await createEmulatorCore({
    wasm: readFileSync(`${runtime}/esp32sim.wasm`),
    chip,
    images: {
      rom: read(`${runtime}/${rom}`),
      bootloader: read(`${fw}/${sketch}.ino.bootloader.bin`),
      partitions: read(`${fw}/${sketch}.ino.partitions.bin`),
      app: read(`${fw}/${sketch}.ino.bin`),
    },
  })
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), error?.logs?.join("\n"))
}

const hz = core.cpuHz
const edges = [], serial = []
const MAX_EMU_SECONDS = Number(arg("max-seconds", "30")), WANT = 8
const started = Date.now()
let stopCode = 0
while (core.cycles() < MAX_EMU_SECONDS * hz) {
  const { stop, events } = core.run(2_000_000, Date.now())
  for (const e of events) {
    if (e.t === "gpio") edges.push({ pin: e.pin, level: e.level, sec: core.cycles() / hz })
    else serial.push(e.data)
  }
  if (stop !== 0) { stopCode = stop; console.error("emulator stopped with code", stop, core.logs().slice(-5).join("\n")); break }
  if (edges.filter((e) => e.pin === pin).length >= WANT && serial.join("").includes("LED off")) break
}
const mine = edges.filter((e) => e.pin === pin)
const wallSeconds = (Date.now() - started) / 1000
console.log(`chip=${chip} emulated=${(core.cycles() / hz).toFixed(2)}s wall=${wallSeconds.toFixed(1)}s edges(pin ${pin})=${mine.length} stop=${stopCode}`)
console.log(mine.slice(0, 10).map((e) => `${e.sec.toFixed(3)}s->${e.level}`).join("  "))
console.log("serial:", JSON.stringify(serial.join("").slice(-80)))

if (stopCode !== 0) fail(`emulator halted with code ${stopCode}`)
if (mine.length < WANT) fail(`expected >= ${WANT} edges on GPIO${pin}, got ${mine.length}`)
for (let i = 1; i < mine.length; i++) if (mine[i].level === mine[i - 1].level) fail("edges do not alternate")
// delay(250) between edges: emulated time between consecutive edges must be ~0.25 s.
const gaps = mine.slice(1).map((e, i) => e.sec - mine[i].sec)
const bad = gaps.find((g) => g < 0.2 || g > 0.35)
if (bad !== undefined) fail(`edge spacing ${bad.toFixed(3)}s is not ~0.25s (delay(250))`)
const out = serial.join("")
if (!out.includes("LED on") || !out.includes("LED off")) fail("serial output missing LED on/off")
console.log("PASS")
