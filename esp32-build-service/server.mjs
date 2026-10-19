// Reference ESP32 build service. Compiles an Arduino sketch with arduino-cli against the pinned
// arduino-esp32 core and returns the three flash images the browser emulator boots.
//
//   BUILD_TOKEN=<random 32+ chars> node esp32-build-service/server.mjs
//
// This is deliberately a small standalone process (no dependencies) so it can run in any container
// host. It must run isolated: no secrets in the environment or filesystem, no outbound network after
// the core is installed, non-root, read-only root filesystem with a writable scratch directory.
// See docs/esp32-build-service.md. The Next.js route authenticates to it with a bearer token.
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises"
import { timingSafeEqual } from "node:crypto"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  FQBN_BY_BOARD,
  LIMITS,
  boundedLog,
  checkSourcePolicy,
  encodeBase64,
  parseCompilerDiagnostics,
} from "./compile-shared.mjs"

const MAX_BODY_BYTES = 64 * 1024

/** Run a process in its own group so a timeout kills the compiler children too. */
function runProcess(command, args, { cwd, env, timeoutMs, maxOutputBytes = 5 * 1024 * 1024 }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] })
    let output = ""
    let timedOut = false
    let spawnError = null
    const append = (chunk) => {
      if (output.length < maxOutputBytes) output += chunk.toString("utf8")
    }
    child.stdout.on("data", append)
    child.stderr.on("data", append)
    const killGroup = () => {
      try { process.kill(-child.pid, "SIGKILL") } catch { try { child.kill("SIGKILL") } catch { /* already gone */ } }
    }
    const timer = setTimeout(() => { timedOut = true; killGroup() }, timeoutMs)
    child.on("error", (error) => { spawnError = error })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code, output, timedOut, spawnError })
    })
  })
}

function tokenMatches(header, expected) {
  const match = /^Bearer (.+)$/.exec(header ?? "")
  if (!match) return false
  const a = Buffer.from(match[1])
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * @param {{
 *   token: string,
 *   arduinoCli?: string,
 *   maxParallel?: number,
 *   maxQueue?: number,
 *   compileTimeoutMs?: number,
 *   cacheDir?: string,
 *   dataDir?: string,
 *   coreVersionLabel?: string,
 * }} options
 */
export function createBuildServer(options) {
  const {
    token,
    arduinoCli = "arduino-cli",
    maxParallel = 2,
    maxQueue = 4,
    compileTimeoutMs = 120_000,
    cacheDir,
    dataDir,
    coreVersionLabel,
  } = options
  if (typeof token !== "string" || token.length < 16) throw new Error("BUILD_TOKEN must be at least 16 characters.")

  let active = 0
  const waiting = []
  const acquire = () => new Promise((resolve) => {
    if (active < maxParallel) { active += 1; resolve(true); return }
    if (waiting.length >= maxQueue) { resolve(false); return }
    waiting.push(resolve)
  })
  const release = () => {
    const next = waiting.shift()
    if (next) next(true)
    else active -= 1
  }

  // Explicit allow-list: the compiler never sees BUILD_TOKEN or any other secret from this process.
  const childEnv = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME ?? tmpdir(),
    LANG: "C.UTF-8",
    ...(dataDir ? { ARDUINO_DIRECTORIES_DATA: dataDir } : {}),
    ...(process.env.ARDUINO_DIRECTORIES_DATA && !dataDir ? { ARDUINO_DIRECTORIES_DATA: process.env.ARDUINO_DIRECTORIES_DATA } : {}),
    ...(process.env.ARDUINO_DIRECTORIES_USER ? { ARDUINO_DIRECTORIES_USER: process.env.ARDUINO_DIRECTORIES_USER } : {}),
  }

  async function compile(source, fqbn) {
    const work = await mkdtemp(join(tmpdir(), "esp32-build-"))
    const sketchDir = join(work, "sketch")
    const outDir = join(work, "out")
    try {
      await mkdir(sketchDir)
      await writeFile(join(sketchDir, "sketch.ino"), source, "utf8")
      const args = ["compile", "--fqbn", fqbn, "--output-dir", outDir, "--warnings", "default", ...(cacheDir ? ["--build-cache-path", cacheDir] : []), sketchDir]
      const result = await runProcess(arduinoCli, args, { cwd: work, env: childEnv, timeoutMs: compileTimeoutMs })
      const roots = [work, cacheDir, dataDir, process.env.HOME].filter(Boolean)

      if (result.timedOut) return { status: 504, body: { ok: false, kind: "timeout", error: "Compilation timed out." } }
      if (result.spawnError) return { status: 500, body: { ok: false, kind: "internal", error: "The compiler is not available on this build service." } }

      if (result.code !== 0) {
        const diagnostics = parseCompilerDiagnostics(result.output, roots)
        const log = boundedLog(result.output, roots)
        if (!diagnostics.some((d) => d.severity === "error")) {
          // No source diagnostic: a toolchain/infrastructure failure, not the user's code. Do not echo internals.
          return { status: 500, body: { ok: false, kind: "internal", error: "The build failed before the sketch could be compiled." } }
        }
        return { status: 200, body: { ok: false, kind: "compile_error", error: "Compilation failed.", diagnostics, log } }
      }

      const read = async (name, max) => {
        const info = await stat(join(outDir, name)) // throws when the compiler did not produce the file
        if (info.size === 0) throw Object.assign(new Error("empty image"), { reason: "internal" })
        if (info.size > max) throw Object.assign(new Error("image too large"), { reason: "too_large" })
        return new Uint8Array(await readFile(join(outDir, name)))
      }
      let bootloader, partitions, app
      try {
        bootloader = await read("sketch.ino.bootloader.bin", LIMITS.maxBootloaderBytes)
        partitions = await read("sketch.ino.partitions.bin", LIMITS.maxPartitionsBytes)
        app = await read("sketch.ino.bin", LIMITS.maxAppBytes)
      } catch (error) {
        if (error?.reason === "too_large") {
          return { status: 200, body: { ok: false, kind: "too_large", error: "The compiled firmware is larger than the simulator supports." } }
        }
        return { status: 500, body: { ok: false, kind: "internal", error: "The compiler did not produce the expected firmware images." } }
      }
      return {
        status: 200,
        body: {
          ok: true,
          artifacts: { bootloader: encodeBase64(bootloader), partitions: encodeBase64(partitions), app: encodeBase64(app) },
          log: boundedLog(result.output, roots),
          toolchain: coreVersionLabel,
        },
      }
    } finally {
      await rm(work, { recursive: true, force: true }).catch(() => {})
    }
  }

  const send = (res, status, body, extra = {}) => {
    const text = JSON.stringify(body)
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(text), "Cache-Control": "no-store", ...extra })
    res.end(text)
  }

  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { ok: true })
    if (req.method !== "POST" || req.url !== "/compile") return send(res, 404, { ok: false, kind: "invalid_request", error: "Not found." })
    if (!tokenMatches(req.headers.authorization, token)) return send(res, 401, { ok: false, kind: "invalid_request", error: "Unauthorized." })

    let raw = ""
    let tooLarge = false
    req.on("data", (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) { tooLarge = true; req.destroy() }
    })
    await new Promise((resolve) => { req.on("end", resolve); req.on("close", resolve) })
    if (tooLarge) return send(res, 413, { ok: false, kind: "too_large", error: "Request too large." })

    let body
    try { body = JSON.parse(raw) } catch { return send(res, 400, { ok: false, kind: "invalid_request", error: "Invalid JSON." }) }
    const board = body?.board
    if (typeof board !== "string" || !Object.prototype.hasOwnProperty.call(FQBN_BY_BOARD, board)) {
      return send(res, 400, { ok: false, kind: "invalid_request", error: "Unsupported board." })
    }
    // The FQBN always comes from our own table; a client-supplied value is ignored, never passed to the CLI.
    const fqbn = FQBN_BY_BOARD[board]
    const policy = checkSourcePolicy(body?.source)
    if (policy) return send(res, 400, { ok: false, kind: "invalid_request", error: policy })

    if (!(await acquire())) return send(res, 503, { ok: false, kind: "busy", error: "The build service is busy." }, { "Retry-After": "10" })
    try {
      const { status, body: result } = await compile(body.source, fqbn)
      send(res, status, result)
    } catch {
      send(res, 500, { ok: false, kind: "internal", error: "Unexpected build service error." })
    } finally {
      release()
    }
  })
  server.requestTimeout = 30_000
  server.headersTimeout = 10_000
  return server
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const token = process.env.BUILD_TOKEN ?? ""
  const port = Number(process.env.PORT ?? 8787)
  const server = createBuildServer({
    token,
    arduinoCli: process.env.ARDUINO_CLI ?? "arduino-cli",
    maxParallel: Number(process.env.MAX_PARALLEL ?? 2),
    maxQueue: Number(process.env.MAX_QUEUE ?? 4),
    compileTimeoutMs: Number(process.env.COMPILE_TIMEOUT_MS ?? 120_000),
    cacheDir: process.env.BUILD_CACHE_DIR,
    dataDir: process.env.ARDUINO_DIRECTORIES_DATA,
    coreVersionLabel: process.env.ESP32_CORE_LABEL,
  })
  server.listen(port, process.env.HOST ?? "0.0.0.0", () => console.log(`esp32-build-service listening on :${port}`))
  const stop = () => server.close(() => process.exit(0))
  process.on("SIGTERM", stop)
  process.on("SIGINT", stop)
}
