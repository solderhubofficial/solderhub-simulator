import { describe, expect, it } from "vitest"
import { buildUploadScript, classifyCompilerLine, hexByteCount } from "@/lib/simulator/avr/build-log"

describe("hexByteCount", () => {
  it("counts only data-record payload bytes", () => {
    const hex = [":100000000C945C000C946E000C946E000C946E00CA", ":0400100001020304E2", ":00000001FF"].join("\n")
    expect(hexByteCount(hex)).toBe(20)
  })
})

describe("classifyCompilerLine", () => {
  it("flags errors and extracts the sketch line", () => {
    expect(classifyCompilerLine("sketch.ino:7:3: error: 'foo' was not declared in this scope")).toEqual({ level: "error", sourceLine: 7 })
  })
  it("flags warnings with a line number", () => {
    expect(classifyCompilerLine("sketch.ino:2:7: warning: unused variable 'x'")).toEqual({ level: "warning", sourceLine: 2 })
  })
  it("highlights the size report", () => {
    expect(classifyCompilerLine("Sketch uses 924 bytes (2%) of program storage space.").level).toBe("success")
  })
})

describe("buildUploadScript", () => {
  it("reports the real image size and ends with Done uploading.", () => {
    const script = buildUploadScript(924)
    expect(script.some((s) => s.text.includes("924 bytes of flash verified"))).toBe(true)
    expect(script.at(-1)?.text).toBe("Done uploading.")
  })
})
