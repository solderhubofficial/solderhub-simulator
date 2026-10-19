import {
  parseServiceResponse,
  validateCompileRequest,
  type Esp32CompileFailure,
  type Esp32CompileResponse,
} from "./compile-contract"
import { isSameOrigin, parseServiceUrl, type ConcurrencyLimiter, type RateLimiter } from "./route-guards"

/** Hard cap on how many bytes of the service response the route will buffer (Vercel responses cap at 4.5 MB). */
export const MAX_SERVICE_RESPONSE_BYTES = 3_500_000

export interface CompileHandlerDeps {
  serviceUrl: string | undefined
  serviceToken: string | undefined
  fetchImpl: typeof fetch
  timeoutMs: number
  limiter: RateLimiter
  concurrency: ConcurrencyLimiter
}

export interface CompileHandlerInput {
  body: unknown
  clientKey: string
  origin: string | null
  host: string | null
  signal?: AbortSignal
}

export interface CompileHandlerResult {
  status: number
  body: Esp32CompileResponse
  headers?: Record<string, string>
}

const failure = (status: number, kind: Esp32CompileFailure["kind"], error: string, headers?: Record<string, string>): CompileHandlerResult => ({
  status,
  body: { ok: false, kind, error },
  headers,
})

async function readBounded(response: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(response.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(merged)
}

/**
 * Validate, rate-limit and forward an ESP32 compile request to the configured build service.
 * All user-facing failures are structured so the editor can say what actually went wrong; nothing here
 * reports success unless the build service returned real, size-checked firmware images.
 */
export async function handleCompile(input: CompileHandlerInput, deps: CompileHandlerDeps): Promise<CompileHandlerResult> {
  if (!isSameOrigin(input.origin, input.host)) return failure(403, "invalid_request", "Cross-site compile requests are not allowed.")

  const validated = validateCompileRequest(input.body)
  if (!validated.ok) return { status: validated.status, body: validated.failure }

  const serviceUrl = parseServiceUrl(deps.serviceUrl)
  if (!serviceUrl || !deps.serviceToken) {
    return failure(503, "unavailable", "ESP32 compilation is not available: no build service is configured for this deployment.")
  }

  if (!deps.limiter.allow(input.clientKey)) {
    return failure(429, "rate_limited", "Too many compile requests. Please wait a minute and try again.", { "Retry-After": "60" })
  }
  const release = deps.concurrency.tryAcquire()
  if (!release) return failure(503, "busy", "The compiler is busy. Please try again in a few seconds.", { "Retry-After": "10" })

  try {
    const timeout = AbortSignal.timeout(deps.timeoutMs)
    const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout
    let response: Response
    try {
      response = await deps.fetchImpl(new URL("/compile", serviceUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deps.serviceToken}` },
        body: JSON.stringify({ source: validated.value.source, board: validated.value.board, fqbn: validated.fqbn }),
        signal,
        cache: "no-store",
        redirect: "error",
      })
    } catch {
      if (input.signal?.aborted) return failure(499, "cancelled", "The compile request was cancelled.")
      if (timeout.aborted) return failure(504, "timeout", "Compilation timed out.")
      return failure(502, "unavailable", "The ESP32 build service could not be reached.")
    }

    const text = await readBounded(response, MAX_SERVICE_RESPONSE_BYTES).catch(() => null)
    if (text === null) return failure(502, "too_large", "The build service response was too large.")
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return failure(502, "internal", `The build service returned an invalid response (HTTP ${response.status}).`)
    }

    const parsed = parseServiceResponse(json, validated.value.board, validated.fqbn)
    if (parsed.ok) return { status: 200, body: parsed }
    const status = parsed.kind === "compile_error" ? 422 : parsed.kind === "timeout" ? 504 : parsed.kind === "busy" ? 503 : parsed.kind === "too_large" || parsed.kind === "invalid_request" ? 400 : 502
    return { status, body: parsed }
  } finally {
    release()
  }
}
