import type { Esp32BoardType } from "./board-adapter"
import {
  FQBN_BY_BOARD,
  LIMITS,
  checkSourcePolicy,
  decodeBase64,
  scrubPaths,
  type CompileDiagnostic,
} from "@/esp32-build-service/compile-shared.mjs"

export type Esp32Diagnostic = CompileDiagnostic

export interface Esp32CompileRequest {
  source: string
  board: Esp32BoardType
}

/** Base64 firmware images as sent over the wire. */
export interface Esp32WireArtifacts {
  bootloader: string
  partitions: string
  app: string
}

/** Decoded firmware images, ready for the emulator. */
export interface Esp32Artifacts {
  bootloader: Uint8Array
  partitions: Uint8Array
  app: Uint8Array
}

export type Esp32CompileFailureKind =
  | "compile_error"
  | "invalid_request"
  | "too_large"
  | "timeout"
  | "busy"
  | "rate_limited"
  | "unavailable"
  | "cancelled"
  | "internal"

export interface Esp32CompileSuccess {
  ok: true
  board: Esp32BoardType
  fqbn: string
  artifacts: Esp32WireArtifacts
  log: string
  /** e.g. "esp32:esp32@3.3.0", reported by the build service. */
  toolchain?: string
}

export interface Esp32CompileFailure {
  ok: false
  kind: Esp32CompileFailureKind
  error: string
  diagnostics?: Esp32Diagnostic[]
  log?: string
}

export type Esp32CompileResponse = Esp32CompileSuccess | Esp32CompileFailure

export { LIMITS as ESP32_COMPILE_LIMITS }

export type ValidatedRequest =
  | { ok: true; value: Esp32CompileRequest; fqbn: string }
  | { ok: false; status: number; failure: Esp32CompileFailure }

const BOARDS = new Set(Object.keys(FQBN_BY_BOARD))

function fail(status: number, kind: Esp32CompileFailureKind, error: string): ValidatedRequest {
  return { ok: false, status, failure: { ok: false, kind, error } }
}

/** Validate untrusted JSON from the browser. Never trust `fqbn`: it is derived from the board. */
export function validateCompileRequest(body: unknown): ValidatedRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail(400, "invalid_request", "The request body must be a JSON object.")
  }
  const { source, board } = body as Record<string, unknown>
  if (typeof board !== "string" || !BOARDS.has(board)) {
    return fail(400, "invalid_request", `Unsupported board. Supported boards: ${[...BOARDS].join(", ")}.`)
  }
  if (typeof source !== "string") return fail(400, "invalid_request", "The sketch source must be a string.")
  if (new TextEncoder().encode(source).length > LIMITS.maxSourceBytes) {
    return fail(413, "too_large", `The sketch is too large (limit ${Math.round(LIMITS.maxSourceBytes / 1000)} KB).`)
  }
  const policy = checkSourcePolicy(source)
  if (policy) return fail(400, "invalid_request", policy)
  return { ok: true, value: { source, board: board as Esp32BoardType }, fqbn: FQBN_BY_BOARD[board] }
}

function asDiagnostics(value: unknown): Esp32Diagnostic[] {
  if (!Array.isArray(value)) return []
  const out: Esp32Diagnostic[] = []
  for (const item of value) {
    if (out.length >= LIMITS.maxDiagnostics) break
    if (typeof item !== "object" || item === null) continue
    const d = item as Record<string, unknown>
    if (d.severity !== "error" && d.severity !== "warning" && d.severity !== "note") continue
    if (typeof d.message !== "string") continue
    const diagnostic: Esp32Diagnostic = { severity: d.severity, message: scrubPaths(d.message).slice(0, LIMITS.maxDiagnosticMessageChars) }
    if (typeof d.file === "string") diagnostic.file = d.file.split(/[\\/]/).pop()?.slice(0, 120)
    if (Number.isInteger(d.line) && (d.line as number) > 0) diagnostic.line = d.line as number
    if (Number.isInteger(d.column) && (d.column as number) > 0) diagnostic.column = d.column as number
    out.push(diagnostic)
  }
  return out
}

/**
 * Validate and sanitise what the build service returned. The route never forwards upstream bytes
 * blindly: sizes are bounded, base64 is checked, and paths are scrubbed from every string.
 */
export function parseServiceResponse(json: unknown, board: Esp32BoardType, fqbn: string): Esp32CompileResponse {
  if (typeof json !== "object" || json === null) {
    return { ok: false, kind: "internal", error: "The build service returned an unreadable response." }
  }
  const r = json as Record<string, unknown>
  const log = typeof r.log === "string" ? scrubPaths(r.log).slice(-LIMITS.maxLogChars) : undefined

  if (r.ok === false) {
    const kind = typeof r.kind === "string" && (["compile_error", "timeout", "busy", "too_large", "invalid_request"] as string[]).includes(r.kind)
      ? (r.kind as Esp32CompileFailureKind)
      : "internal"
    const error = typeof r.error === "string" ? scrubPaths(r.error).slice(0, 600) : "Compilation failed."
    return { ok: false, kind, error, diagnostics: asDiagnostics(r.diagnostics), log }
  }

  const a = typeof r.artifacts === "object" && r.artifacts !== null ? (r.artifacts as Record<string, unknown>) : null
  if (r.ok !== true || !a) return { ok: false, kind: "internal", error: "The build service response was missing firmware artifacts." }

  const checks: [keyof Esp32WireArtifacts, number][] = [
    ["bootloader", LIMITS.maxBootloaderBytes],
    ["partitions", LIMITS.maxPartitionsBytes],
    ["app", LIMITS.maxAppBytes],
  ]
  for (const [name, max] of checks) {
    const bytes = decodeBase64(a[name])
    if (!bytes || bytes.length === 0) return { ok: false, kind: "internal", error: `The ${name} image from the build service is invalid.` }
    if (bytes.length > max) return { ok: false, kind: "too_large", error: `The ${name} image is larger than the ${Math.round(max / 1024)} KB limit.` }
  }
  return {
    ok: true,
    board,
    fqbn,
    artifacts: { bootloader: a.bootloader as string, partitions: a.partitions as string, app: a.app as string },
    log: log ?? "",
    toolchain: typeof r.toolchain === "string" ? r.toolchain.slice(0, 80) : undefined,
  }
}

/** Decode wire artifacts to bytes. Throws if the data is not valid base64 (callers validated already). */
export function decodeArtifacts(wire: Esp32WireArtifacts): Esp32Artifacts {
  const bootloader = decodeBase64(wire.bootloader)
  const partitions = decodeBase64(wire.partitions)
  const app = decodeBase64(wire.app)
  if (!bootloader || !partitions || !app) throw new Error("Firmware artifacts are not valid base64.")
  return { bootloader, partitions, app }
}
