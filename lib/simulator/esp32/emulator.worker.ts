// Dedicated Web Worker that runs real ESP32 firmware on the patched esp32sim WebAssembly emulator.
//
// Isolation: the emulator, the firmware and its memory live only in this Worker. The page talks to it
// through the two small message unions in runtime-protocol.ts / bridge-protocol.ts, and terminating the
// Worker releases everything. Nothing here touches the DOM or the circuit.
import {
  ESP32_BRIDGE_CHANNEL,
  ESP32_BRIDGE_VERSION,
  ESP32_MAX_SERIAL_CHARS,
  type Esp32BridgeMessage,
} from "./bridge-protocol"
import { isValidAssetBase, type Esp32WorkerCommand } from "./runtime-protocol"
import { EmulatorError, ROM_FILES, createEmulatorCore, parseSha256Sums, sha256Hex } from "@/esp32-runtime/emulator-core.mjs"

interface WorkerScope {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  close(): void
}
const scope = self as unknown as WorkerScope

const MAX_WASM_BYTES = 64 * 1024 * 1024
const MAX_ROM_BYTES = 16 * 1024 * 1024
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ASSET_TIMEOUT_MS = 30_000
const SLICE_CYCLES = 2_000_000
const MAX_CATCH_UP_SECONDS = 0.25
const FLUSH_INTERVAL_MS = 16
/** Above this many queued GPIO edges in one flush, collapse to the last level per pin. */
const MAX_EDGES_PER_FLUSH = 256

let stopRequested = false
let started = false

const base = { channel: ESP32_BRIDGE_CHANNEL, version: ESP32_BRIDGE_VERSION } as const
const post = (message: Esp32BridgeMessage) => scope.postMessage(message)
const postStatus = (state: "booting" | "running" | "stopped" | "error", detail?: string) =>
  post(detail === undefined ? { ...base, type: "status", state } : { ...base, type: "status", state, detail: detail.slice(0, 500) })

class RuntimeAssetError extends Error {}

async function fetchBytes(url: string, maxBytes: number, what: string): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(ASSET_TIMEOUT_MS), credentials: "omit", redirect: "follow" })
  } catch {
    throw new RuntimeAssetError(`Could not download the ${what}. Check your connection and try again.`)
  }
  if (response.status === 404) {
    throw new RuntimeAssetError(`The ESP32 emulator runtime is not deployed on this server (${what} not found). See docs/esp32-firmware-integration.md.`)
  }
  if (!response.ok) throw new RuntimeAssetError(`Could not download the ${what} (HTTP ${response.status}).`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > maxBytes) throw new RuntimeAssetError(`The ${what} has an unexpected size.`)
  return bytes
}

async function verified(name: string, bytes: Uint8Array, sums: Record<string, string>): Promise<void> {
  const expected = sums[name]
  if (!expected) throw new RuntimeAssetError(`The runtime manifest does not list ${name}.`)
  if ((await sha256Hex(bytes)) !== expected) throw new RuntimeAssetError(`${name} failed its integrity check; the emulator assets are corrupt or out of date.`)
}

const nextTick = (() => {
  const channel = new MessageChannel()
  let resolver: (() => void) | null = null
  channel.port1.onmessage = () => { const r = resolver; resolver = null; r?.() }
  return () => new Promise<void>((resolve) => { resolver = resolve; channel.port2.postMessage(0) })
})()
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function collapseEdges(edges: { pin: number; level: 0 | 1 }[]): { pin: number; level: 0 | 1 }[] {
  if (edges.length <= MAX_EDGES_PER_FLUSH) return edges
  const last = new Map<number, 0 | 1>()
  for (const e of edges) { last.delete(e.pin); last.set(e.pin, e.level) }
  return [...last].map(([pin, level]) => ({ pin, level }))
}

async function run(command: Extract<Esp32WorkerCommand, { type: "start" }>): Promise<void> {
  const { chip, assetBase, artifacts } = command
  if (!Object.prototype.hasOwnProperty.call(ROM_FILES, chip)) throw new RuntimeAssetError(`Chip "${String(chip)}" is not supported.`)
  if (typeof assetBase !== "string" || !isValidAssetBase(assetBase)) throw new RuntimeAssetError("The emulator asset location is invalid.")
  for (const name of ["bootloader", "partitions", "app"] as const) {
    const bytes = artifacts?.[name]
    if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new RuntimeAssetError(`The ${name} image is missing or too large.`)
  }

  postStatus("booting")
  const romName = ROM_FILES[chip as keyof typeof ROM_FILES]
  const [wasm, rom, sumsBytes] = await Promise.all([
    fetchBytes(`${assetBase}/esp32sim.wasm`, MAX_WASM_BYTES, "emulator module (esp32sim.wasm)"),
    fetchBytes(`${assetBase}/${romName}`, MAX_ROM_BYTES, `ROM image (${romName})`),
    fetchBytes(`${assetBase}/SHA256SUMS`, 64 * 1024, "asset manifest (SHA256SUMS)"),
  ])
  const sums = parseSha256Sums(new TextDecoder().decode(sumsBytes))
  await verified("esp32sim.wasm", wasm, sums)
  await verified(romName, rom, sums)
  if (stopRequested) { postStatus("stopped"); return }

  const core = await createEmulatorCore({
    wasm,
    chip: chip as keyof typeof ROM_FILES,
    images: { rom, bootloader: artifacts.bootloader, partitions: artifacts.partitions, app: artifacts.app },
  })
  post({ ...base, type: "ready", chip: chip === "esp32c3" ? "esp32-c3" : "esp32" })

  const hz = core.cpuHz
  let pendingEdges: { pin: number; level: 0 | 1 }[] = []
  let pendingSerial = ""
  let lastFlush = performance.now()
  let reportedRunning = false
  let last = performance.now()
  let owed = 0

  const flush = () => {
    if (pendingEdges.length) {
      for (const e of collapseEdges(pendingEdges)) post({ ...base, type: "gpio", pin: e.pin, level: e.level })
      pendingEdges = []
    }
    while (pendingSerial.length) {
      post({ ...base, type: "serial", port: "uart0", data: pendingSerial.slice(0, ESP32_MAX_SERIAL_CHARS) })
      pendingSerial = pendingSerial.slice(ESP32_MAX_SERIAL_CHARS)
    }
    lastFlush = performance.now()
  }

  try {
    while (!stopRequested) {
      const t = performance.now()
      owed = Math.min(owed + ((t - last) / 1000) * hz, hz * MAX_CATCH_UP_SECONDS)
      last = t
      if (owed < hz / 1000) { await sleep(1); continue }

      const slice = Math.min(owed, SLICE_CYCLES)
      const { stop, events } = core.run(slice, Date.now())
      owed -= slice
      for (const e of events) {
        if (e.t === "gpio") pendingEdges.push({ pin: e.pin, level: e.level })
        else pendingSerial += e.data
      }
      if (stop !== 0) {
        flush()
        const tail = core.logs().slice(-3).join(" | ")
        postStatus("error", `The emulated CPU halted (code ${stop}).${tail ? ` ${tail}` : ""}`)
        return
      }
      if (!reportedRunning) { reportedRunning = true; postStatus("running") }
      if (performance.now() - lastFlush >= FLUSH_INTERVAL_MS) flush()
      await nextTick() // lets a queued "stop" message run between slices
    }
    flush()
    postStatus("stopped")
  } finally {
    core.dispose()
  }
}

scope.onmessage = (event) => {
  const command = event.data as Esp32WorkerCommand | null
  if (!command || typeof command !== "object") return
  if (command.type === "stop") {
    stopRequested = true
    return
  }
  if (command.type !== "start" || started) return
  started = true
  run(command)
    .catch((error: unknown) => {
      const detail = error instanceof EmulatorError || error instanceof RuntimeAssetError || error instanceof Error ? error.message : "Unknown emulator failure."
      postStatus("error", detail)
    })
    .finally(() => {
      // The controller terminates this Worker too; closing here frees the wasm memory if it does not.
      scope.close()
    })
}
