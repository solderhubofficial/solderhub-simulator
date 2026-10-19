import { describe, expect, it } from "vitest"
import { createEsp32RuntimeController, type WorkerLike } from "./runtime-controller"
import type { Esp32RuntimeStatus, Esp32WorkerCommand } from "./runtime-protocol"
import { isValidAssetBase, resolveAssetBase } from "./runtime-protocol"
import type { Esp32BridgeMessage } from "./bridge-protocol"

const base = { channel: "solderhub:esp32-bridge", version: 1 } as const
const status = (state: string, detail?: string) => ({ ...base, type: "status", state, ...(detail ? { detail } : {}) })
const gpio = (pin: number, level: number) => ({ ...base, type: "gpio", pin, level })

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null
  onerror: WorkerLike["onerror"] = null
  onmessageerror: WorkerLike["onmessageerror"] = null
  sent: Esp32WorkerCommand[] = []
  terminated = 0
  postMessage(m: Esp32WorkerCommand) { this.sent.push(m) }
  terminate() { this.terminated++ }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent<unknown>) }
}

const artifacts = { bootloader: new Uint8Array([1]), partitions: new Uint8Array([2]), app: new Uint8Array([3, 4]) }

function setup(extra: Partial<Parameters<typeof createEsp32RuntimeController>[0]> = {}) {
  const workers: FakeWorker[] = []
  const statuses: Esp32RuntimeStatus[] = []
  const messages: Esp32BridgeMessage[] = []
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = []
  const controller = createEsp32RuntimeController({
    createWorker: () => { const w = new FakeWorker(); workers.push(w); return w },
    onStatus: (s) => statuses.push(s),
    onMessage: (m) => messages.push(m),
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t },
    clearTimer: (h) => { (h as { cleared: boolean }).cleared = true },
    ...extra,
  })
  return { controller, workers, statuses, messages, timers }
}

describe("Esp32RuntimeController", () => {
  it("starts the worker with copies of the artifacts and only reports running when the worker does", () => {
    const { controller, workers, statuses } = setup()
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    expect(statuses.map((s) => s.state)).toEqual(["starting"])
    const sent = workers[0].sent[0] as Extract<Esp32WorkerCommand, { type: "start" }>
    expect(sent).toMatchObject({ type: "start", chip: "esp32", assetBase: "/esp32" })
    expect(sent.artifacts.app).toEqual(artifacts.app)
    expect(sent.artifacts.app).not.toBe(artifacts.app) // a copy: Reset can reuse the originals

    workers[0].emit(status("booting"))
    expect(statuses.at(-1)?.state).toBe("booting")
    workers[0].emit(status("running"))
    expect(statuses.at(-1)?.state).toBe("running")
  })

  it("forwards validated gpio/serial messages and drops everything else", () => {
    const { controller, workers, messages } = setup()
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    workers[0].emit(gpio(2, 1))
    workers[0].emit({ ...base, type: "serial", port: "uart0", data: "hi\n" })
    workers[0].emit(gpio(99, 1)) // out of range pin
    workers[0].emit({ type: "gpio", pin: 2, level: 1 }) // wrong channel
    workers[0].emit("garbage")
    expect(messages.map((m) => m.type)).toEqual(["gpio", "serial"])
  })

  it("terminates the worker and reports the reason when the emulator reports an error", () => {
    const { controller, workers, statuses } = setup()
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    workers[0].emit(status("error", "The emulated CPU halted (code 3)."))
    expect(statuses.at(-1)).toEqual({ state: "error", detail: "The emulated CPU halted (code 3)." })
    expect(workers[0].terminated).toBe(1)
    expect(controller.isActive()).toBe(false)
  })

  it("surfaces worker crashes and unreadable messages", () => {
    const a = setup()
    a.controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    a.workers[0].onerror?.({ message: "boom" } as ErrorEvent)
    expect(a.statuses.at(-1)).toMatchObject({ state: "error" })
    expect(a.workers[0].terminated).toBe(1)

    const b = setup()
    b.controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    b.workers[0].onmessageerror?.({} as MessageEvent)
    expect(b.statuses.at(-1)).toMatchObject({ state: "error" })
  })

  it("times out when the emulator never reports running, and cancels the timer once it does", () => {
    const a = setup({ startTimeoutMs: 1234 })
    a.controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    expect(a.timers[0].ms).toBe(1234)
    a.timers[0].fn()
    expect(a.statuses.at(-1)).toMatchObject({ state: "error", detail: expect.stringContaining("did not start") })
    expect(a.workers[0].terminated).toBe(1)

    const b = setup()
    b.controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    b.workers[0].emit(status("running"))
    expect(b.timers[0].cleared).toBe(true)
  })

  it("stop sends stop, terminates, reports stopped, and ignores late messages", () => {
    const { controller, workers, statuses, messages } = setup()
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    workers[0].emit(status("running"))
    controller.stop()
    expect(workers[0].sent.at(-1)).toEqual({ type: "stop" })
    expect(workers[0].terminated).toBe(1)
    expect(statuses.at(-1)?.state).toBe("stopped")
    const before = messages.length
    workers[0].onmessage?.({ data: gpio(2, 1) } as MessageEvent<unknown>) // handlers were detached
    expect(messages.length).toBe(before)
    controller.stop() // idempotent
    expect(workers[0].terminated).toBe(1)
  })

  it("a restart replaces the previous worker and ignores its stale events", () => {
    const { controller, workers, messages } = setup()
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    expect(workers[0].terminated).toBe(1)
    workers[0].emit(gpio(2, 1))
    expect(messages).toHaveLength(0)
    workers[1].emit(gpio(2, 1))
    expect(messages).toHaveLength(1)
  })

  it("rejects unsupported chips, bad asset locations and empty images without creating a worker", () => {
    const { controller, workers, statuses } = setup()
    controller.start({ chip: "esp32s3" as never, assetBase: "/esp32", artifacts })
    controller.start({ chip: "esp32", assetBase: "http://evil.example.com", artifacts })
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts: { ...artifacts, app: new Uint8Array() } })
    expect(workers).toHaveLength(0)
    expect(statuses.map((s) => s.state)).toEqual(["error", "error", "error"])
  })

  it("reports a failure to create the worker", () => {
    const { controller, statuses } = setup({ createWorker: () => { throw new Error("no workers") } })
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    expect(statuses.at(-1)).toMatchObject({ state: "error", detail: expect.stringContaining("no workers") })
  })

  it("drops messages beyond the rate limit", () => {
    let t = 0
    const { controller, workers, messages } = setup({ maxMessagesPerSecond: 3, now: () => t })
    controller.start({ chip: "esp32", assetBase: "/esp32", artifacts })
    for (let i = 0; i < 10; i++) workers[0].emit(gpio(2, i % 2))
    expect(messages).toHaveLength(3)
    t = 1500
    workers[0].emit(gpio(2, 1))
    expect(messages).toHaveLength(4)
  })
})

describe("asset base validation", () => {
  it("accepts same-origin paths and https URLs only", () => {
    expect(isValidAssetBase("/esp32")).toBe(true)
    expect(isValidAssetBase("https://cdn.example.com/esp32")).toBe(true)
    expect(isValidAssetBase("//evil.com/x")).toBe(false)
    expect(isValidAssetBase("/a/../b")).toBe(false)
    expect(isValidAssetBase("http://cdn.example.com")).toBe(false)
    expect(isValidAssetBase("https://user:pw@cdn.example.com")).toBe(false)
    expect(isValidAssetBase("javascript:alert(1)")).toBe(false)
  })
  it("falls back to the default when the configured value is invalid", () => {
    expect(resolveAssetBase(undefined)).toBe("/esp32")
    expect(resolveAssetBase("https://cdn.example.com/esp32/")).toBe("https://cdn.example.com/esp32")
    expect(resolveAssetBase("http://nope")).toBe("/esp32")
  })
})
