import { describe, expect, it } from "vitest"
import { ESP32_COMPILE_LIMITS, decodeArtifacts, parseServiceResponse, validateCompileRequest } from "./compile-contract"
import { encodeBase64 } from "@/esp32-build-service/compile-shared.mjs"

const b64 = (n: number) => encodeBase64(new Uint8Array(n).fill(7))
const okBody = (over: Record<string, unknown> = {}) => ({
  ok: true,
  artifacts: { bootloader: b64(100), partitions: b64(50), app: b64(400) },
  log: "Sketch uses 1 bytes",
  toolchain: "esp32:esp32@3.3.0",
  ...over,
})

describe("validateCompileRequest", () => {
  it("derives the FQBN from the board and ignores client-supplied values", () => {
    const r = validateCompileRequest({ source: "void setup(){}void loop(){}", board: "esp32-devkit", fqbn: "evil:--flag" })
    expect(r).toMatchObject({ ok: true, fqbn: "esp32:esp32:esp32" })
  })
  it("rejects bad shapes, boards and sources", () => {
    expect(validateCompileRequest(null)).toMatchObject({ ok: false, status: 400 })
    expect(validateCompileRequest([])).toMatchObject({ ok: false, status: 400 })
    expect(validateCompileRequest({ source: "x", board: "arduino-uno" })).toMatchObject({ ok: false, status: 400 })
    expect(validateCompileRequest({ source: 5, board: "esp32-devkit" })).toMatchObject({ ok: false, status: 400 })
    expect(validateCompileRequest({ source: "x".repeat(ESP32_COMPILE_LIMITS.maxSourceBytes + 1), board: "esp32-devkit" })).toMatchObject({ ok: false, status: 413 })
    expect(validateCompileRequest({ source: '#include "/etc/passwd"', board: "esp32-devkit" })).toMatchObject({ ok: false, status: 400 })
  })
})

describe("parseServiceResponse", () => {
  it("accepts well-formed artifacts", () => {
    const r = parseServiceResponse(okBody(), "esp32-devkit", "esp32:esp32:esp32")
    expect(r.ok).toBe(true)
    if (r.ok) expect(decodeArtifacts(r.artifacts).app).toHaveLength(400)
  })
  it("rejects missing, empty, invalid or oversized images", () => {
    expect(parseServiceResponse(okBody({ artifacts: undefined }), "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "internal" })
    expect(parseServiceResponse(okBody({ artifacts: { bootloader: "", partitions: b64(1), app: b64(1) } }), "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "internal" })
    expect(parseServiceResponse(okBody({ artifacts: { bootloader: "!!!!", partitions: b64(1), app: b64(1) } }), "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "internal" })
    expect(parseServiceResponse(okBody({ artifacts: { bootloader: b64(1), partitions: b64(1), app: b64(ESP32_COMPILE_LIMITS.maxAppBytes + 1) } }), "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "too_large" })
  })
  it("refuses ok:true without real artifacts and non-objects", () => {
    expect(parseServiceResponse({ ok: true }, "esp32-devkit", "f")).toMatchObject({ ok: false })
    expect(parseServiceResponse("nope", "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "internal" })
  })
  it("passes compile errors through with scrubbed, bounded diagnostics", () => {
    const r = parseServiceResponse(
      { ok: false, kind: "compile_error", error: "Compilation failed in /root/.arduino15/x/y/z.cpp", diagnostics: [{ severity: "error", message: "bad /home/u/a/b/c.h", file: "/tmp/x/sketch.ino", line: 3, column: 2 }, { severity: "bogus", message: "x" }, { severity: "error" }], log: "/opt/a/b/c.ino:1:1: error: q" },
      "esp32-devkit",
      "f",
    )
    expect(r).toMatchObject({ ok: false, kind: "compile_error" })
    if (!r.ok) {
      expect(r.error).not.toMatch(/\/root/)
      expect(r.diagnostics).toEqual([{ severity: "error", message: "bad c.h", file: "sketch.ino", line: 3, column: 2 }])
      expect(r.log).not.toMatch(/\/opt/)
    }
  })
  it("maps unknown failure kinds to internal", () => {
    expect(parseServiceResponse({ ok: false, kind: "weird", error: "x" }, "esp32-devkit", "f")).toMatchObject({ ok: false, kind: "internal" })
  })
})
