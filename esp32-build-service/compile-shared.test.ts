import { describe, expect, it } from "vitest"
import { LIMITS, FQBN_BY_BOARD, boundedLog, checkSourcePolicy, decodeBase64, encodeBase64, parseCompilerDiagnostics, scrubPaths } from "./compile-shared.mjs"

describe("checkSourcePolicy", () => {
  it("accepts an ordinary sketch", () => {
    expect(checkSourcePolicy("#include <Arduino.h>\n#include \"local.h\"\nvoid setup(){}\nvoid loop(){}\n")).toBeNull()
  })
  it("rejects empty, oversized and NUL sources", () => {
    expect(checkSourcePolicy("   ")).toMatch(/empty/i)
    expect(checkSourcePolicy("x".repeat(LIMITS.maxSourceBytes + 1))).toMatch(/too large/i)
    expect(checkSourcePolicy("void setup(){}\0")).toMatch(/NUL/)
    expect(checkSourcePolicy(42)).toMatch(/empty/i)
  })
  it("rejects includes that read host files", () => {
    expect(checkSourcePolicy('#include "/etc/passwd"')).toMatch(/absolute/i)
    expect(checkSourcePolicy("#include </etc/shadow>")).toMatch(/absolute/i)
    expect(checkSourcePolicy('#  include "../../secret.h"')).toMatch(/absolute|parent/i)
    expect(checkSourcePolicy('#include "C:\\\\Windows\\\\win.ini"')).toMatch(/absolute/i)
    expect(checkSourcePolicy('#include_next "/x"')).toMatch(/absolute/i)
  })
  it("rejects __has_include and assembler file inclusion", () => {
    expect(checkSourcePolicy("#if __has_include(\"/etc/passwd\")\n#endif")).toMatch(/__has_include/)
    expect(checkSourcePolicy('asm(".incbin \\"/etc/passwd\\"");')).toMatch(/incbin/)
  })
})

describe("scrubPaths and diagnostics", () => {
  it("removes server paths but keeps file names", () => {
    const text = "In file included from /home/builder/arduino-data/packages/esp32/hardware/esp32/3.3.0/cores/esp32/Arduino.h:35:\n/tmp/esp32-build-abc/sketch/sketch.ino:5:3: error: 'foo' was not declared in this scope"
    const clean = scrubPaths(text, ["/tmp/esp32-build-abc"])
    expect(clean).not.toMatch(/\/home\/builder|\/tmp\//)
    expect(clean).toContain("Arduino.h:35:")
    expect(clean).toContain("sketch.ino:5:3: error:")
  })
  it("scrubs Windows paths", () => {
    expect(scrubPaths("C:\\Users\\bob\\AppData\\sketch.ino:1:1: error: x")).toBe("sketch.ino:1:1: error: x")
  })
  it("parses gcc diagnostics with file, line, column and severity", () => {
    const out = [
      "/tmp/w/sketch/sketch.ino: In function 'void loop()':",
      "/tmp/w/sketch/sketch.ino:7:3: error: 'bar' was not declared in this scope",
      "/tmp/w/sketch/sketch.ino:9:5: warning: unused variable 'x' [-Wunused-variable]",
      "/tmp/w/sketch/sketch.ino:2:10: fatal error: nope.h: No such file or directory",
      "/tmp/w/sketch/sketch.ino:3:1: note: declared here",
      "exit status 1",
    ].join("\n")
    expect(parseCompilerDiagnostics(out, ["/tmp/w"])).toEqual([
      { severity: "error", message: "'bar' was not declared in this scope", file: "sketch.ino", line: 7, column: 3 },
      { severity: "warning", message: "unused variable 'x' [-Wunused-variable]", file: "sketch.ino", line: 9, column: 5 },
      { severity: "error", message: "nope.h: No such file or directory", file: "sketch.ino", line: 2, column: 10 },
      { severity: "note", message: "declared here", file: "sketch.ino", line: 3, column: 1 },
    ])
  })
  it("bounds the number of diagnostics and the log length", () => {
    const many = Array.from({ length: 200 }, (_, i) => `sketch.ino:${i + 1}:1: error: e${i}`).join("\n")
    expect(parseCompilerDiagnostics(many)).toHaveLength(LIMITS.maxDiagnostics)
    expect(boundedLog("x".repeat(LIMITS.maxLogChars * 2)).length).toBeLessThanOrEqual(LIMITS.maxLogChars + 1)
  })
})

describe("base64 helpers", () => {
  it("round-trips bytes including large arrays", () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 31) & 0xff)
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes)
  })
  it("rejects malformed input", () => {
    expect(decodeBase64("")).toBeNull()
    expect(decodeBase64("abc")).toBeNull()
    expect(decodeBase64("ab$=")).toBeNull()
    expect(decodeBase64(5)).toBeNull()
  })
})

it("maps each supported board to an esp32 FQBN", () => {
  expect(FQBN_BY_BOARD).toEqual({ "esp32-devkit": "esp32:esp32:esp32", "esp32-c3": "esp32:esp32:esp32c3" })
})
