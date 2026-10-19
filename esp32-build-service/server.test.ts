// Protocol, validation and isolation tests for the build service. The compiler here is a SCRIPTED STAND-IN
// for arduino-cli (so the suite runs anywhere); it is NOT evidence that real ESP32 compilation works.
// Real compilation is exercised by the "ESP32 build service" job in .github/workflows/esp32-e2e.yml.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { chmodSync, mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AddressInfo } from "node:net"
import { createBuildServer } from "./server.mjs"
import { decodeBase64 } from "./compile-shared.mjs"

const TOKEN = "unit-test-token-0123456789abcdef"
let dir: string
let cli: string

const FAKE_CLI = `#!/bin/sh
# args: compile --fqbn F --output-dir OUT ... SKETCHDIR
out=""; sketch=""
while [ $# -gt 0 ]; do
  case "$1" in
    --output-dir) out="$2"; shift 2;;
    compile|--warnings|--fqbn|--build-cache-path) if [ "$1" = compile ]; then shift; else shift 2; fi;;
    *) sketch="$1"; shift;;
  esac
done
src="$sketch/sketch.ino"
if grep -q SLOW "$src"; then sleep 2; fi
if grep -q HANG "$src"; then sleep 30; fi
if grep -q COMPILE_ERROR "$src"; then
  echo "$sketch/sketch.ino: In function 'void loop()':" >&2
  echo "$sketch/sketch.ino:3:5: error: 'nope' was not declared in this scope" >&2
  echo "exit status 1" >&2
  exit 1
fi
if grep -q TOOLCHAIN_BROKEN "$src"; then echo "internal failure at /usr/lib/secret/place" >&2; exit 1; fi
if grep -q NO_OUTPUT "$src"; then echo "ok"; exit 0; fi
mkdir -p "$out"
printf 'BOOT' > "$out/sketch.ino.bootloader.bin"
printf 'PART' > "$out/sketch.ino.partitions.bin"
if grep -q HUGE "$src"; then head -c 2200000 /dev/zero > "$out/sketch.ino.bin"; else printf 'APPIMAGE' > "$out/sketch.ino.bin"; fi
echo "Sketch uses 8 bytes"
if [ -n "$BUILD_TOKEN" ]; then echo "LEAKED_TOKEN"; fi
exit 0
`

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "fake-cli-"))
  cli = join(dir, "arduino-cli")
  writeFileSync(cli, FAKE_CLI)
  chmodSync(cli, 0o755)
  process.env.BUILD_TOKEN = TOKEN // the service must NOT forward this to the compiler
})
afterAll(() => { rmSync(dir, { recursive: true, force: true }); delete process.env.BUILD_TOKEN })

async function withServer<T>(options: Partial<Parameters<typeof createBuildServer>[0]>, fn: (call: (body: unknown, headers?: Record<string, string>) => Promise<{ status: number; json: any }>, base: string) => Promise<T>): Promise<T> {
  const server = createBuildServer({ token: TOKEN, arduinoCli: cli, compileTimeoutMs: 5000, ...options })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = async (body: unknown, headers: Record<string, string> = { Authorization: `Bearer ${TOKEN}` }) => {
    const res = await fetch(`${base}/compile`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) })
    return { status: res.status, json: await res.json() }
  }
  try { return await fn(call, base) } finally { await new Promise((resolve) => server.close(resolve)); server.closeAllConnections?.() }
}

const sketch = (extra = "") => `// ${extra}\nvoid setup(){}\nvoid loop(){}\n`

describe("build service", () => {
  it("refuses to start without a strong token", () => {
    expect(() => createBuildServer({ token: "short" })).toThrow(/BUILD_TOKEN/)
  })

  it("serves /healthz without auth and 404s everything else", async () => {
    await withServer({}, async (_call, base) => {
      expect((await fetch(`${base}/healthz`)).status).toBe(200)
      expect((await fetch(`${base}/nope`)).status).toBe(404)
      expect((await fetch(`${base}/compile`)).status).toBe(404) // GET
    })
  })

  it("requires the bearer token", async () => {
    await withServer({}, async (call) => {
      expect((await call({ source: sketch(), board: "esp32-devkit" }, {})).status).toBe(401)
      expect((await call({ source: sketch(), board: "esp32-devkit" }, { Authorization: "Bearer wrong-token-wrong-token-wrong" })).status).toBe(401)
    })
  })

  it("validates board, JSON, source policy and size", async () => {
    await withServer({}, async (call) => {
      expect((await call({ source: sketch(), board: "arduino-uno" })).json).toMatchObject({ ok: false, kind: "invalid_request" })
      expect((await call("{not json")).status).toBe(400)
      expect((await call({ source: '#include "/etc/passwd"', board: "esp32-devkit" })).status).toBe(400)
      expect((await call({ source: "x".repeat(100_000), board: "esp32-devkit" })).status).toBe(413)
    })
  })

  it("returns the three images as base64 on success and keeps secrets from the compiler", async () => {
    await withServer({ coreVersionLabel: "esp32:esp32@test" }, async (call) => {
      const { status, json } = await call({ source: sketch(), board: "esp32-devkit", fqbn: "ignored:evil" })
      expect(status).toBe(200)
      expect(json.ok).toBe(true)
      expect(new TextDecoder().decode(decodeBase64(json.artifacts.app)!)).toBe("APPIMAGE")
      expect(new TextDecoder().decode(decodeBase64(json.artifacts.bootloader)!)).toBe("BOOT")
      expect(new TextDecoder().decode(decodeBase64(json.artifacts.partitions)!)).toBe("PART")
      expect(json.toolchain).toBe("esp32:esp32@test")
      expect(json.log).toContain("Sketch uses 8 bytes")
      expect(json.log).not.toContain("LEAKED_TOKEN")
    })
  })

  it("reports compile errors with line/column diagnostics and no server paths", async () => {
    await withServer({}, async (call) => {
      const { status, json } = await call({ source: sketch("COMPILE_ERROR"), board: "esp32-devkit" })
      expect(status).toBe(200)
      expect(json).toMatchObject({ ok: false, kind: "compile_error" })
      expect(json.diagnostics).toContainEqual({ severity: "error", message: "'nope' was not declared in this scope", file: "sketch.ino", line: 3, column: 5 })
      expect(JSON.stringify(json)).not.toMatch(/\/tmp\/|esp32-build-/)
    })
  })

  it("hides toolchain internals when the failure is not the user's code", async () => {
    await withServer({}, async (call) => {
      const { status, json } = await call({ source: sketch("TOOLCHAIN_BROKEN"), board: "esp32-devkit" })
      expect(status).toBe(500)
      expect(json).toMatchObject({ ok: false, kind: "internal" })
      expect(JSON.stringify(json)).not.toContain("/usr/lib/secret")
    })
  })

  it("never reports success when the compiler produced no images, or oversized ones", async () => {
    await withServer({}, async (call) => {
      expect((await call({ source: sketch("NO_OUTPUT"), board: "esp32-devkit" })).json).toMatchObject({ ok: false, kind: "internal" })
      expect((await call({ source: sketch("HUGE"), board: "esp32-devkit" })).json).toMatchObject({ ok: false, kind: "too_large" })
    })
  })

  it("kills a compile that exceeds the timeout", async () => {
    await withServer({ compileTimeoutMs: 400 }, async (call) => {
      const started = Date.now()
      const { status, json } = await call({ source: sketch("HANG"), board: "esp32-devkit" })
      expect(status).toBe(504)
      expect(json.kind).toBe("timeout")
      expect(Date.now() - started).toBeLessThan(5000)
    })
  })

  it("sheds load with 503 busy when the queue is full", async () => {
    await withServer({ maxParallel: 1, maxQueue: 0 }, async (call) => {
      const slow = call({ source: sketch("SLOW"), board: "esp32-devkit" })
      await new Promise((r) => setTimeout(r, 300))
      const shed = await call({ source: sketch(), board: "esp32-devkit" })
      expect(shed.status).toBe(503)
      expect(shed.json.kind).toBe("busy")
      expect((await slow).json.ok).toBe(true)
    })
  })
})
