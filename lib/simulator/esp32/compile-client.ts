import type { Esp32BoardType } from "./board-adapter"
import {
  decodeArtifacts,
  parseServiceResponse,
  type Esp32Artifacts,
  type Esp32CompileFailureKind,
  type Esp32Diagnostic,
} from "./compile-contract"
import { getEsp32Target, type Esp32Chip } from "./targets"

export interface CompiledEsp32Firmware {
  board: Esp32BoardType
  chip: Esp32Chip
  fqbn: string
  artifacts: Esp32Artifacts
  log: string
  toolchain?: string
}

export type Esp32CompileOutcome =
  | { ok: true; firmware: CompiledEsp32Firmware }
  | { ok: false; kind: Esp32CompileFailureKind | "network"; error: string; diagnostics: Esp32Diagnostic[]; log?: string }

export const ESP32_COMPILE_ENDPOINT = "/api/esp32/compile"

/**
 * POST a sketch to the compile route. Resolves ok:true only when the route returned size-checked firmware
 * images; every other path (HTTP error, bad JSON, network failure, abort) resolves with a described failure.
 */
export async function compileEsp32Sketch(
  input: { source: string; board: Esp32BoardType },
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<Esp32CompileOutcome> {
  const target = getEsp32Target(input.board)
  if (!target) return { ok: false, kind: "invalid_request", error: `"${input.board}" has no ESP32 compile target.`, diagnostics: [] }
  const doFetch = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await doFetch(options.endpoint ?? ESP32_COMPILE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: input.source, board: input.board }),
      signal: options.signal,
    })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      return { ok: false, kind: "cancelled", error: "Compilation was cancelled.", diagnostics: [] }
    }
    return { ok: false, kind: "network", error: "Couldn't reach the compile service. Check your connection and try again.", diagnostics: [] }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return { ok: false, kind: "internal", error: `The compile service returned an unreadable response (HTTP ${response.status}).`, diagnostics: [] }
  }

  const parsed = parseServiceResponse(json, input.board, target.fqbn)
  if (!parsed.ok) {
    return { ok: false, kind: parsed.kind, error: parsed.error, diagnostics: parsed.diagnostics ?? [], log: parsed.log }
  }
  if (!response.ok) {
    // A success body on a failing status is not trustworthy.
    return { ok: false, kind: "internal", error: `Unexpected response from the compile service (HTTP ${response.status}).`, diagnostics: [] }
  }
  try {
    return {
      ok: true,
      firmware: { board: input.board, chip: target.chip, fqbn: target.fqbn, artifacts: decodeArtifacts(parsed.artifacts), log: parsed.log, toolchain: parsed.toolchain },
    }
  } catch {
    return { ok: false, kind: "internal", error: "The firmware image could not be decoded.", diagnostics: [] }
  }
}

/** One console line per diagnostic, in the gcc format the editor's click-to-line parser understands. */
export function formatDiagnostic(d: Esp32Diagnostic): string {
  const where = d.file ? `${d.file}${d.line ? `:${d.line}${d.column ? `:${d.column}` : ""}` : ""}: ` : ""
  return `${where}${d.severity}: ${d.message}`
}
