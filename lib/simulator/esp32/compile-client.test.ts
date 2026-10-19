import { describe, expect, it } from "vitest"
import { compileEsp32Sketch, formatDiagnostic } from "./compile-client"
import { encodeBase64 } from "@/esp32-build-service/compile-shared.mjs"

const wire = (n: number) => encodeBase64(new Uint8Array(n).fill(9))
const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
const input = { source: "void setup(){}", board: "esp32-devkit" as const }

describe("compileEsp32Sketch", () => {
  it("decodes real artifacts into bytes", async () => {
    const r = await compileEsp32Sketch(input, { fetchImpl: reply({ ok: true, artifacts: { bootloader: wire(8), partitions: wire(4), app: wire(16) }, log: "ok", toolchain: "esp32:esp32@3.3.0" }) })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.firmware.chip).toBe("esp32")
      expect(r.firmware.artifacts.app).toEqual(new Uint8Array(16).fill(9))
    }
  })
  it("reports compile errors with diagnostics and never a firmware", async () => {
    const r = await compileEsp32Sketch(input, { fetchImpl: reply({ ok: false, kind: "compile_error", error: "Compilation failed.", diagnostics: [{ severity: "error", message: "x", file: "sketch.ino", line: 2, column: 5 }] }, 422) })
    expect(r).toMatchObject({ ok: false, kind: "compile_error", diagnostics: [{ line: 2 }] })
    expect("firmware" in r).toBe(false)
  })
  it("treats a success body on a failing HTTP status as untrustworthy", async () => {
    const r = await compileEsp32Sketch(input, { fetchImpl: reply({ ok: true, artifacts: { bootloader: wire(8), partitions: wire(4), app: wire(16) } }, 500) })
    expect(r.ok).toBe(false)
  })
  it("maps network failures, aborts and unreadable bodies", async () => {
    expect(await compileEsp32Sketch(input, { fetchImpl: (async () => { throw new TypeError("x") }) as unknown as typeof fetch })).toMatchObject({ ok: false, kind: "network" })
    const c = new AbortController(); c.abort()
    expect(await compileEsp32Sketch(input, { signal: c.signal, fetchImpl: (async () => { throw new DOMException("a", "AbortError") }) as unknown as typeof fetch })).toMatchObject({ ok: false, kind: "cancelled" })
    expect(await compileEsp32Sketch(input, { fetchImpl: (async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch })).toMatchObject({ ok: false, kind: "internal" })
  })
  it("formats diagnostics so the editor can jump to the line", () => {
    expect(formatDiagnostic({ severity: "error", message: "boom", file: "sketch.ino", line: 3, column: 7 })).toBe("sketch.ino:3:7: error: boom")
    expect(formatDiagnostic({ severity: "warning", message: "w" })).toBe("warning: w")
  })
})
