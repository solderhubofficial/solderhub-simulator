// Thin, dependency-free wrapper over the C ABI of the patched esp32sim WebAssembly module.
//
// This is the ONLY place that knows the `esp32sim_*` ABI. The same file is used by
//   - the browser Web Worker (lib/simulator/esp32/emulator.worker.ts),
//   - the headless CI end-to-end check (scripts/esp32/e2e-blink.mjs),
//   - the unit tests (against a fake ABI) and the runtime smoke test (against the real wasm).
// so what CI proves about the ABI is what the browser executes.
//
// The emulated GPIO edges come from the emulated CPU running the compiled firmware; nothing here
// fabricates or replays signals.
import { createJitHost } from "./jit.mjs"

/** `kind` argument of esp32sim_load. */
export const LOAD_KIND = Object.freeze({ ROM: 0, BOOTLOADER: 1, PARTITIONS: 2, APP: 3 })

/** Mask ROM ELF per chip (fetched by scripts/esp32/build-runtime.sh, pinned by SHA-256 upstream). */
export const ROM_FILES = Object.freeze({
  esp32: "esp32_rev300_rom.elf",
  esp32s3: "esp32s3_rev0_rom.elf",
  esp32c3: "esp32c3_rev3_rom.elf",
  esp32c6: "esp32c6_rev0_rom.elf",
})

/** Outbox entries of this kind carry a JSON text message. */
const OUT_KIND_TEXT = 1
const MAX_LOG_LINES = 50
const MAX_EVENT_TEXT_BYTES = 64 * 1024

export class EmulatorError extends Error {
  /** @param {"unsupported_chip"|"instantiate_failed"|"create_failed"|"load_failed"|"boot_failed"|"run_failed"|"disposed"} code */
  constructor(code, message, logs = []) {
    super(message)
    this.name = "EmulatorError"
    this.code = code
    this.logs = logs
  }
}

/**
 * @param {{
 *   wasm: BufferSource | WebAssembly.Module,
 *   chip: keyof typeof ROM_FILES,
 *   images: { rom: Uint8Array, bootloader: Uint8Array, partitions: Uint8Array, app: Uint8Array },
 *   flashMb?: number,
 *   enableJit?: boolean,
 *   onLog?: (line: string) => void,
 * }} options
 */
export async function createEmulatorCore(options) {
  const { wasm, chip, images, flashMb = 4, enableJit = false, onLog } = options
  if (!Object.prototype.hasOwnProperty.call(ROM_FILES, chip)) {
    throw new EmulatorError("unsupported_chip", `Unsupported chip "${String(chip)}".`)
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const logs = []
  let exports = null
  let emu = 0
  let disposed = false

  const pushLog = (line) => {
    logs.push(line)
    if (logs.length > MAX_LOG_LINES) logs.shift()
    onLog?.(line)
  }
  const mem = () => new Uint8Array(exports.memory.buffer)
  const withBytes = (bytes, fn) => {
    const ptr = exports.esp32sim_alloc(bytes.length)
    mem().set(bytes, ptr)
    try {
      return fn(ptr, bytes.length)
    } finally {
      exports.esp32sim_free(ptr, bytes.length)
    }
  }

  const jit = createJitHost(() => exports)
  let instantiated
  try {
    instantiated = await WebAssembly.instantiate(wasm, {
      env: { ...jit.imports, host_log: (p, n) => pushLog(decoder.decode(mem().subarray(p, p + n))) },
    })
  } catch (error) {
    throw new EmulatorError("instantiate_failed", `Could not instantiate the emulator module: ${error instanceof Error ? error.message : String(error)}`)
  }
  // instantiate(bytes) resolves { module, instance }; instantiate(Module) resolves the Instance.
  exports = (instantiated.instance ?? instantiated).exports

  emu = withBytes(encoder.encode(`solderhub-${chip}`), (p, n) => exports.esp32sim_new(p, n, flashMb, 0))
  if (!emu) throw new EmulatorError("create_failed", `The emulator could not create a ${chip} machine.`, [...logs])
  exports.esp32sim_set_jit(emu, enableJit ? 1 : 0)

  const load = (kind, name, bytes) => {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new EmulatorError("load_failed", `The ${name} image is empty.`, [...logs])
    }
    const rc = withBytes(bytes, (p, n) => exports.esp32sim_load(emu, kind, p, n))
    if (rc !== 0) throw new EmulatorError("load_failed", `The emulator rejected the ${name} image (code ${rc}).`, [...logs])
  }
  load(LOAD_KIND.ROM, "ROM", images.rom)
  load(LOAD_KIND.BOOTLOADER, "bootloader", images.bootloader)
  load(LOAD_KIND.PARTITIONS, "partition table", images.partitions)
  load(LOAD_KIND.APP, "application", images.app)
  const bootRc = exports.esp32sim_boot(emu, 0)
  if (bootRc !== 0) throw new EmulatorError("boot_failed", `The emulator failed to boot the firmware (code ${bootRc}).`, [...logs])

  const cpuHz = exports.esp32sim_cpu_hz(emu)

  /** Pull everything the emulator queued since the last call: GPIO edges and serial text. */
  const drain = () => {
    const events = []
    const n = exports.esp32sim_out_take(emu)
    for (let i = 0; i < n; i++) {
      if (exports.esp32sim_out_kind(emu, i) !== OUT_KIND_TEXT) continue
      const len = exports.esp32sim_out_len(emu, i)
      if (len > MAX_EVENT_TEXT_BYTES) continue
      const ptr = exports.esp32sim_out_ptr(emu, i)
      let message
      try {
        message = JSON.parse(decoder.decode(mem().subarray(ptr, ptr + len)))
      } catch {
        continue
      }
      if (message?.t === "gpio" && Number.isInteger(message.pin) && (message.level === 0 || message.level === 1)) {
        events.push({ t: "gpio", pin: message.pin, level: message.level })
      } else if (message?.t === "serial" && typeof message.data === "string") {
        events.push({ t: "serial", data: message.data })
      }
    }
    return events
  }

  return {
    chip,
    cpuHz,
    /** Emulated CPU cycles executed so far. */
    cycles: () => exports.esp32sim_cycles(emu),
    /** Most recent emulator log lines (bounded). */
    logs: () => [...logs],
    jitStats: () => ({ ...jit.stats }),
    /**
     * Execute up to `cycles` CPU cycles. `stop` is 0 while the machine is healthy; any other value
     * means the emulated CPU halted (fault, exit, unsupported instruction) and execution cannot continue.
     */
    run(cycles, unixMs = Date.now()) {
      if (disposed) throw new EmulatorError("disposed", "The emulator was already disposed.")
      const budget = Math.max(1, Math.min(Math.floor(cycles), 0xffff_ffff))
      const stop = exports.esp32sim_run(emu, budget, unixMs)
      return { stop, events: drain() }
    },
    /** Drop all references. The wasm memory is released once the instance is garbage collected (or the Worker is terminated). */
    dispose() {
      disposed = true
      exports = null
      emu = 0
    },
  }
}

/** Parse a `sha256sum`-style manifest into { fileName: lowercaseHex }. Ignores malformed lines. */
export function parseSha256Sums(text) {
  const out = {}
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^([0-9a-fA-F]{64})\s+\*?(\S+)$/.exec(line.trim())
    if (match) out[match[2]] = match[1].toLowerCase()
  }
  return out
}

/** Hex SHA-256 of bytes using WebCrypto (available in browsers, Workers and Node 20+). */
export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}
