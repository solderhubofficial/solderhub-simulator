import { NextRequest, NextResponse } from "next/server"
import { handleCompile } from "@/lib/simulator/esp32/compile-handler"
import { createConcurrencyLimiter, createRateLimiter } from "@/lib/simulator/esp32/route-guards"

// Node runtime: this route only forwards to the external ESP32 build service (arduino-cli plus the
// Xtensa/RISC-V toolchains are hundreds of MB and cannot live in a Vercel Function). The AVR route at
// /api/compile is untouched.
export const runtime = "nodejs"
export const maxDuration = 60

const COMPILE_TIMEOUT_MS = 55_000
const limiter = createRateLimiter({ windowMs: 60_000, max: 6 })
const concurrency = createConcurrencyLimiter(2)

function clientKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the left-most entry is the client.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, kind: "invalid_request", error: "Invalid JSON body." }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const result = await handleCompile(
    { body, clientKey: clientKey(req), origin: req.headers.get("origin"), host: req.headers.get("host"), signal: req.signal },
    {
      serviceUrl: process.env.ESP32_COMPILE_SERVICE_URL,
      serviceToken: process.env.ESP32_COMPILE_SERVICE_TOKEN,
      fetchImpl: fetch,
      timeoutMs: COMPILE_TIMEOUT_MS,
      limiter,
      concurrency,
    },
  )
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store", ...result.headers } })
}
