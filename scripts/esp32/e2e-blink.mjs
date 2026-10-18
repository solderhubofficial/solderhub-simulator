// Headless end-to-end check: compiled Arduino firmware -> real emulator (wasm) -> GPIO/serial messages.
// Drives the same C ABI the browser worker uses (esp32sim_*). No faked signals: edges come from the
// emulated CPU executing the firmware.
//   node scripts/esp32/e2e-blink.mjs --chip esp32|esp32c3|esp32s3|esp32c6 --runtime DIR --fw DIR [--pin 4]
import { readFileSync } from "node:fs"
import { createJitHost } from "../../esp32-runtime/jit.mjs"

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d }
const chip = arg("chip"), runtime = arg("runtime"), fw = arg("fw"), pin = Number(arg("pin", "4"))
const ROM = { esp32: "esp32_rev300_rom.elf", esp32s3: "esp32s3_rev0_rom.elf", esp32c3: "esp32c3_rev3_rom.elf", esp32c6: "esp32c6_rev0_rom.elf" }[chip]
if (!ROM || !runtime || !fw) { console.error("usage: --chip <esp32|esp32c3|esp32s3|esp32c6> --runtime DIR --fw DIR"); process.exit(2) }

const dec = new TextDecoder(), enc = new TextEncoder()
let wasm
const mem = () => new Uint8Array(wasm.memory.buffer)
const withBytes = (bytes, f) => { const p = wasm.esp32sim_alloc(bytes.length); mem().set(bytes, p); try { return f(p, bytes.length) } finally { wasm.esp32sim_free(p, bytes.length) } }
const jit = createJitHost(() => wasm)
const logs = []
const { instance } = await WebAssembly.instantiate(readFileSync(`${runtime}/esp32sim.wasm`), {
  env: { ...jit.imports, host_log: (p, n) => logs.push(dec.decode(mem().subarray(p, p + n))) },
})
wasm = instance.exports

const board = `solderhub-${chip}`
const emu = withBytes(enc.encode(board), (p, n) => wasm.esp32sim_new(p, n, 4, 0))
if (!emu) { console.error("esp32sim_new failed for", board, logs.join("\n")); process.exit(1) }
wasm.esp32sim_set_jit(emu, 0)
const load = (kind, file) => { const rc = withBytes(readFileSync(file), (p, n) => wasm.esp32sim_load(emu, kind, p, n)); if (rc) { console.error("load failed", file, logs.join("\n")); process.exit(1) } }
load(0, `${runtime}/${ROM}`)
load(1, `${fw}/blink.ino.bootloader.bin`)
load(2, `${fw}/blink.ino.partitions.bin`)
load(3, `${fw}/blink.ino.bin`)
if (wasm.esp32sim_boot(emu, 0) !== 0) { console.error("boot failed", logs.join("\n")); process.exit(1) }

const hz = wasm.esp32sim_cpu_hz(emu)
const edges = [], serial = []
const drain = () => {
  const n = wasm.esp32sim_out_take(emu)
  for (let i = 0; i < n; i++) {
    if (wasm.esp32sim_out_kind(emu, i) !== 1) continue
    const p = wasm.esp32sim_out_ptr(emu, i), len = wasm.esp32sim_out_len(emu, i)
    let m; try { m = JSON.parse(dec.decode(mem().subarray(p, p + len))) } catch { continue }
    if (m.t === "gpio") edges.push({ pin: m.pin, level: m.level, sec: wasm.esp32sim_cycles(emu) / hz })
    else if (m.t === "serial") serial.push(m.data)
  }
}
const MAX_EMU_SECONDS = Number(arg("max-seconds", "30")), WANT = 8
const started = Date.now()
while (wasm.esp32sim_cycles(emu) < MAX_EMU_SECONDS * hz) {
  const rc = wasm.esp32sim_run(emu, 2_000_000, Date.now())
  drain()
  if (rc !== 0) { console.error("emulator stopped with code", rc, logs.slice(-5).join("\n")); break }
  if (edges.filter(e => e.pin === pin).length >= WANT && serial.join("").includes("LED off")) break
}
const mine = edges.filter(e => e.pin === pin)
console.log(`chip=${chip} emulated=${(wasm.esp32sim_cycles(emu) / hz).toFixed(2)}s wall=${((Date.now() - started) / 1000).toFixed(1)}s edges(pin ${pin})=${mine.length}`)
console.log(mine.slice(0, 10).map(e => `${e.sec.toFixed(3)}s->${e.level}`).join("  "))
console.log("serial:", JSON.stringify(serial.join("").slice(-80)))

const fail = (m) => { console.error("FAIL:", m); process.exit(1) }
if (mine.length < WANT) fail(`expected >= ${WANT} edges on GPIO${pin}, got ${mine.length}`)
for (let i = 1; i < mine.length; i++) if (mine[i].level === mine[i - 1].level) fail("edges do not alternate")
// delay(250) between edges: emulated time between consecutive edges must be ~0.25 s.
const gaps = mine.slice(1).map((e, i) => e.sec - mine[i].sec)
const bad = gaps.find(g => g < 0.2 || g > 0.35)
if (bad !== undefined) fail(`edge spacing ${bad.toFixed(3)}s is not ~0.25s (delay(250))`)
const out = serial.join("")
if (!out.includes("LED on") || !out.includes("LED off")) fail("serial output missing LED on/off")
console.log("PASS")
