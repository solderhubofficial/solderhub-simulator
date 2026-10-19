import { describe, expect, it, vi } from "vitest"
import { handleCompile, MAX_SERVICE_RESPONSE_BYTES, type CompileHandlerDeps } from "./compile-handler"
import { createConcurrencyLimiter, createRateLimiter } from "./route-guards"
import { encodeBase64 } from "@/esp32-build-service/compile-shared.mjs"

const SOURCE = "void setup(){}\nvoid loop(){}\n"
const input = (over: Record<string, unknown> = {}) => ({
  body: { source: SOURCE, board: "esp32-devkit" },
  clientKey: "1.2.3.4",
  origin: null,
  host: "sim.example.com",
  ...over,
})
const okJson = {
  ok: true,
  artifacts: { bootloader: encodeBase64(new Uint8Array(10).fill(1)), partitions: encodeBase64(new Uint8Array(10).fill(2)), app: encodeBase64(new Uint8Array(100).fill(3)) },
  log: "done",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
const deps = (over: Partial<CompileHandlerDeps> = {}): CompileHandlerDeps => ({
  serviceUrl: "https://build.example.com",
  serviceToken: "t".repeat(32),
  fetchImpl: vi.fn(async () => json(okJson)) as unknown as typeof fetch,
  timeoutMs: 5000,
  limiter: createRateLimiter({ windowMs: 60_000, max: 100 }),
  concurrency: createConcurrencyLimiter(5),
  ...over,
})

describe("handleCompile", () => {
  it("returns real artifacts from the service and authenticates to it", async () => {
    const d = deps()
    const r = await handleCompile(input(), d)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ ok: true, board: "esp32-devkit", fqbn: "esp32:esp32:esp32" })
    const call = (d.fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(call[0])).toBe("https://build.example.com/compile")
    expect((call[1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${"t".repeat(32)}` })
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ source: SOURCE, board: "esp32-devkit", fqbn: "esp32:esp32:esp32" })
  })

  it("is unavailable (never a fake success) when no build service is configured", async () => {
    for (const over of [{ serviceUrl: undefined }, { serviceToken: undefined }, { serviceUrl: "http://insecure.example.com" }]) {
      const fetchImpl = vi.fn()
      const r = await handleCompile(input(), deps({ ...over, fetchImpl: fetchImpl as unknown as typeof fetch }))
      expect(r).toMatchObject({ status: 503, body: { ok: false, kind: "unavailable" } })
      expect(fetchImpl).not.toHaveBeenCalled()
    }
  })

  it("rejects cross-site requests and invalid input before touching the service", async () => {
    const fetchImpl = vi.fn()
    const d = deps({ fetchImpl: fetchImpl as unknown as typeof fetch })
    expect((await handleCompile(input({ origin: "https://evil.com" }), d)).status).toBe(403)
    expect((await handleCompile(input({ body: { source: SOURCE, board: "arduino-uno" } }), d)).status).toBe(400)
    expect((await handleCompile(input({ body: { source: '#include "/etc/passwd"', board: "esp32-devkit" } }), d)).status).toBe(400)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("rate limits per client and caps concurrency", async () => {
    const limited = deps({ limiter: createRateLimiter({ windowMs: 60_000, max: 1 }) })
    expect((await handleCompile(input(), limited)).status).toBe(200)
    expect(await handleCompile(input(), limited)).toMatchObject({ status: 429, body: { kind: "rate_limited" }, headers: { "Retry-After": "60" } })

    const concurrency = createConcurrencyLimiter(1)
    concurrency.tryAcquire()
    expect(await handleCompile(input(), deps({ concurrency }))).toMatchObject({ status: 503, body: { kind: "busy" } })
  })

  it("releases its concurrency slot after success and failure", async () => {
    const concurrency = createConcurrencyLimiter(1)
    await handleCompile(input(), deps({ concurrency }))
    await handleCompile(input(), deps({ concurrency, fetchImpl: (async () => { throw new Error("down") }) as unknown as typeof fetch }))
    expect(concurrency.inFlight()).toBe(0)
  })

  it("surfaces compile errors with diagnostics (HTTP 422)", async () => {
    const body = { ok: false, kind: "compile_error", error: "Compilation failed.", diagnostics: [{ severity: "error", message: "oops", file: "sketch.ino", line: 4, column: 1 }] }
    const r = await handleCompile(input(), deps({ fetchImpl: (async () => json(body)) as unknown as typeof fetch }))
    expect(r.status).toBe(422)
    expect(r.body).toMatchObject({ ok: false, kind: "compile_error", diagnostics: [{ line: 4 }] })
  })

  it("maps network failure, timeout and cancellation", async () => {
    const down = deps({ fetchImpl: (async () => { throw new TypeError("fetch failed") }) as unknown as typeof fetch })
    expect(await handleCompile(input(), down)).toMatchObject({ status: 502, body: { kind: "unavailable" } })

    const hang = deps({ timeoutMs: 20, fetchImpl: ((_u: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch })
    expect(await handleCompile(input(), hang)).toMatchObject({ status: 504, body: { kind: "timeout" } })

    const controller = new AbortController()
    const cancel = deps({ fetchImpl: ((_u: unknown, init: RequestInit) => new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))))) as unknown as typeof fetch })
    const pending = handleCompile(input({ signal: controller.signal }), cancel)
    controller.abort()
    expect(await pending).toMatchObject({ status: 499, body: { kind: "cancelled" } })
  })

  it("rejects unreadable and oversized service responses", async () => {
    expect(await handleCompile(input(), deps({ fetchImpl: (async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch }))).toMatchObject({ status: 502, body: { kind: "internal" } })
    const big = new Response("x".repeat(MAX_SERVICE_RESPONSE_BYTES + 10), { status: 200 })
    expect(await handleCompile(input(), deps({ fetchImpl: (async () => big) as unknown as typeof fetch }))).toMatchObject({ status: 502, body: { kind: "too_large" } })
  })

  it("does not accept a success payload with invalid images", async () => {
    const bad = { ok: true, artifacts: { bootloader: "AAAA", partitions: "AAAA", app: "not base64!" } }
    const r = await handleCompile(input(), deps({ fetchImpl: (async () => json(bad)) as unknown as typeof fetch }))
    expect(r.body.ok).toBe(false)
  })
})
