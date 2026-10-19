import { parseEsp32BridgeMessage, type Esp32BridgeMessage } from "./bridge-protocol"
import type { Esp32Artifacts } from "./compile-contract"
import { ESP32_RUNTIME_CHIPS, isValidAssetBase, type Esp32RuntimeStatus, type Esp32WorkerCommand } from "./runtime-protocol"
import type { Esp32Chip } from "./targets"

/** The slice of the Worker API the controller uses; tests pass a fake. */
export interface WorkerLike {
  postMessage(message: Esp32WorkerCommand, transfer?: Transferable[]): void
  terminate(): void
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null
}

export interface Esp32RuntimeControllerOptions {
  createWorker: () => WorkerLike
  onStatus: (status: Esp32RuntimeStatus) => void
  /** Every validated gpio/serial/ready message from the Worker. */
  onMessage: (message: Esp32BridgeMessage) => void
  /** Give up if the emulator has not reported `running` or `error` within this long. */
  startTimeoutMs?: number
  /** Drop messages beyond this rate (per second) as a last line of defence against a misbehaving Worker. */
  maxMessagesPerSecond?: number
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

export interface Esp32RuntimeController {
  start(input: { chip: Esp32Chip; assetBase: string; artifacts: Esp32Artifacts }): void
  /** Tell the Worker to stop, then terminate it. Safe to call at any time and more than once. */
  stop(reason?: string): void
  isActive(): boolean
}

/**
 * Owns one emulator Worker at a time. It never reports `running` until the Worker itself says the
 * firmware booted and executed, and it terminates the Worker on stop, error, timeout and dispose so the
 * wasm memory is released.
 */
export function createEsp32RuntimeController(options: Esp32RuntimeControllerOptions): Esp32RuntimeController {
  const {
    createWorker,
    onStatus,
    onMessage,
    startTimeoutMs = 60_000,
    maxMessagesPerSecond = 4_000,
    now = () => Date.now(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  } = options

  let worker: WorkerLike | null = null
  let startTimer: unknown = null
  let generation = 0
  let windowStart = 0
  let windowCount = 0

  const clearStartTimer = () => {
    if (startTimer !== null) clearTimer(startTimer)
    startTimer = null
  }

  const teardown = () => {
    clearStartTimer()
    const current = worker
    worker = null
    generation += 1
    if (!current) return
    current.onmessage = null
    current.onerror = null
    current.onmessageerror = null
    try { current.terminate() } catch { /* already gone */ }
  }

  const fail = (detail: string) => {
    teardown()
    onStatus({ state: "error", detail })
  }

  return {
    start({ chip, assetBase, artifacts }) {
      teardown()
      if (!ESP32_RUNTIME_CHIPS.includes(chip)) return fail(`Chip "${chip}" is not supported by the browser emulator.`)
      if (!isValidAssetBase(assetBase)) return fail("The emulator asset location is invalid.")
      if (!artifacts.app.length || !artifacts.bootloader.length || !artifacts.partitions.length) return fail("The firmware image is empty.")

      const mine = ++generation
      let created: WorkerLike
      try {
        created = createWorker()
      } catch (error) {
        return fail(`Could not start the emulator worker${error instanceof Error ? `: ${error.message}` : "."}`)
      }
      worker = created
      windowStart = now()
      windowCount = 0
      onStatus({ state: "starting" })

      created.onmessage = (event) => {
        if (mine !== generation) return
        const t = now()
        if (t - windowStart >= 1000) { windowStart = t; windowCount = 0 }
        if (++windowCount > maxMessagesPerSecond) return
        const message = parseEsp32BridgeMessage(event.data)
        if (!message) return
        if (message.type === "status") {
          if (message.state === "running") clearStartTimer()
          if (message.state === "error") return fail(message.detail ?? "The emulator reported an error.")
          if (message.state === "stopped") { teardown(); onStatus({ state: "stopped", detail: message.detail }); return }
          onStatus({ state: message.state === "booting" ? "booting" : "running", detail: message.detail })
          return
        }
        onMessage(message)
      }
      created.onerror = (event) => {
        if (mine !== generation) return
        fail(`The emulator worker crashed${event?.message ? `: ${String(event.message).slice(0, 200)}` : "."}`)
      }
      created.onmessageerror = () => {
        if (mine !== generation) return
        fail("The emulator worker sent an unreadable message.")
      }
      startTimer = setTimer(() => {
        if (mine === generation) fail("The emulator did not start in time.")
      }, startTimeoutMs)

      // Copies (not transfers): the compiled artifacts stay available for Reset and re-Run.
      created.postMessage({
        type: "start",
        chip,
        assetBase,
        artifacts: { bootloader: artifacts.bootloader.slice(), partitions: artifacts.partitions.slice(), app: artifacts.app.slice() },
      })
    },

    stop(reason) {
      const current = worker
      if (!current) return
      try { current.postMessage({ type: "stop" }) } catch { /* worker already dead */ }
      teardown()
      onStatus({ state: "stopped", detail: reason })
    },

    isActive: () => worker !== null,
  }
}
