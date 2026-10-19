import { describe, expect, it } from "vitest"
import { EmulatorError, ROM_FILES, createEmulatorCore, parseSha256Sums, sha256Hex } from "./emulator-core.mjs"

describe("emulator core helpers", () => {
  it("parses sha256sum manifests and ignores malformed lines", () => {
    const a = "a".repeat(64), b = "B".repeat(64)
    expect(parseSha256Sums(`${a}  esp32sim.wasm\n${b} *rom.elf\nnot a hash  x\n\n`)).toEqual({ "esp32sim.wasm": a, "rom.elf": "b".repeat(64) })
  })
  it("hashes bytes with SHA-256", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  })
  it("knows a ROM per chip", () => {
    expect(Object.keys(ROM_FILES).sort()).toEqual(["esp32", "esp32c3", "esp32c6", "esp32s3"])
  })
  it("refuses unknown chips and invalid wasm without touching the machine", async () => {
    const images = { rom: new Uint8Array(1), bootloader: new Uint8Array(1), partitions: new Uint8Array(1), app: new Uint8Array(1) }
    await expect(createEmulatorCore({ wasm: new Uint8Array(8), chip: "z80" as never, images })).rejects.toMatchObject({ code: "unsupported_chip" })
    await expect(createEmulatorCore({ wasm: new Uint8Array([1, 2, 3]), chip: "esp32", images })).rejects.toBeInstanceOf(EmulatorError)
    await expect(createEmulatorCore({ wasm: new Uint8Array([1, 2, 3]), chip: "esp32", images })).rejects.toMatchObject({ code: "instantiate_failed" })
  })
})

// ---- ABI behaviour against a scripted stand-in for the wasm exports (no real emulator involved).
// This checks the wrapper's own logic (loading order, draining, error mapping). That firmware really
// runs and toggles GPIO is proven by scripts/esp32/e2e-blink.mjs against the real wasm in CI.
import { vi, afterEach } from "vitest"

function fakeExports(options: { loadRc?: number; bootRc?: number; createPtr?: number; script?: object[][]; stopOn?: number } = {}) {
  const memory = new WebAssembly.Memory({ initial: 1 })
  let next = 1024
  const loaded: { kind: number; length: number }[] = []
  const queue: Uint8Array[] = []
  let runs = 0
  const encoder = new TextEncoder()
  const exports = {
    memory,
    esp32sim_alloc: (n: number) => { const p = next; next += n + 8; return p },
    esp32sim_free: () => {},
    esp32sim_new: () => options.createPtr ?? 77,
    esp32sim_set_jit: () => {},
    esp32sim_load: (_e: number, kind: number, _p: number, length: number) => { loaded.push({ kind, length }); return options.loadRc ?? 0 },
    esp32sim_boot: () => options.bootRc ?? 0,
    esp32sim_cpu_hz: () => 160_000_000,
    esp32sim_cycles: () => runs * 1000,
    esp32sim_run: () => {
      const events = options.script?.[runs] ?? []
      queue.length = 0
      for (const e of events) queue.push(encoder.encode(JSON.stringify(e)))
      runs++
      return options.stopOn !== undefined && runs >= options.stopOn ? 5 : 0
    },
    esp32sim_out_take: () => queue.length,
    esp32sim_out_kind: () => 1,
    esp32sim_out_len: (_e: number, i: number) => queue[i].length,
    esp32sim_out_ptr: (_e: number, i: number) => { const p = next; next += queue[i].length + 8; new Uint8Array(memory.buffer).set(queue[i], p); return p },
  }
  return { exports, loaded }
}

const images = { rom: new Uint8Array([1, 2]), bootloader: new Uint8Array([3]), partitions: new Uint8Array([4]), app: new Uint8Array([5, 6, 7]) }
const useFake = (fake: ReturnType<typeof fakeExports>) =>
  vi.spyOn(WebAssembly, "instantiate").mockResolvedValue({ module: {} as WebAssembly.Module, instance: { exports: fake.exports } as unknown as WebAssembly.Instance } as never)

afterEach(() => vi.restoreAllMocks())

describe("emulator core ABI wrapper", () => {
  it("loads ROM, bootloader, partitions and app in order, then boots", async () => {
    const fake = fakeExports()
    useFake(fake)
    const core = await createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })
    expect(fake.loaded).toEqual([{ kind: 0, length: 2 }, { kind: 1, length: 1 }, { kind: 2, length: 1 }, { kind: 3, length: 3 }])
    expect(core.cpuHz).toBe(160_000_000)
  })

  it("returns only valid gpio and serial events from the outbox", async () => {
    const fake = fakeExports({ script: [[{ t: "gpio", pin: 4, level: 1 }, { t: "serial", data: "LED on\n" }, { t: "gpio", pin: 4, level: 7 }, { t: "gpio", pin: "x", level: 1 }, { t: "ring" }, { t: "stat" }]] })
    useFake(fake)
    const core = await createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })
    expect(core.run(1000)).toEqual({ stop: 0, events: [{ t: "gpio", pin: 4, level: 1 }, { t: "serial", data: "LED on\n" }] })
  })

  it("reports a halted CPU through the stop code", async () => {
    const fake = fakeExports({ stopOn: 2 })
    useFake(fake)
    const core = await createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32c3", images })
    expect(core.run(10).stop).toBe(0)
    expect(core.run(10).stop).toBe(5)
  })

  it("maps creation, load and boot failures to coded errors", async () => {
    useFake(fakeExports({ createPtr: 0 }))
    await expect(createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })).rejects.toMatchObject({ code: "create_failed" })
    vi.restoreAllMocks()
    useFake(fakeExports({ loadRc: 3 }))
    await expect(createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })).rejects.toMatchObject({ code: "load_failed" })
    vi.restoreAllMocks()
    useFake(fakeExports({ bootRc: 2 }))
    await expect(createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })).rejects.toMatchObject({ code: "boot_failed" })
    vi.restoreAllMocks()
    useFake(fakeExports())
    await expect(createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images: { ...images, app: new Uint8Array() } })).rejects.toMatchObject({ code: "load_failed" })
  })

  it("refuses to run after dispose", async () => {
    useFake(fakeExports())
    const core = await createEmulatorCore({ wasm: new Uint8Array(1), chip: "esp32", images })
    core.dispose()
    expect(() => core.run(10)).toThrow(/disposed/)
  })
})
