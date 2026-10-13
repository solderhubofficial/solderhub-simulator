/**
 * Browser-side client for the `/api/compile` route (arduino-cli + avr-gcc on
 * the server). Used to build the firmware for projects that ship an Arduino
 * sketch instead of a pre-built hex -- so what runs is exactly the sketch
 * shown to the reader.
 *
 * Compiled hex is cached in sessionStorage by sketch content, so reloading an
 * embed or re-opening a project in the same tab doesn't recompile.
 */

export type CompileResult = { ok: true; hex: string } | { ok: false; error: string }

const CACHE_PREFIX = "sh-sim-hex:"

/** Small, stable, non-cryptographic hash -- only used to key the cache. */
export function hashSource(source: string): string {
  let h = 5381
  for (let i = 0; i < source.length; i++) h = ((h << 5) + h + source.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + "-" + source.length.toString(36)
}

function readCache(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeCache(key: string, hex: string): void {
  try {
    sessionStorage.setItem(key, hex)
  } catch {
    /* storage unavailable or full -- caching is best-effort */
  }
}

export async function compileSketch(
  source: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CompileResult> {
  const key = CACHE_PREFIX + hashSource(source)
  const cached = readCache(key)
  if (cached) return { ok: true, hex: cached }

  try {
    const res = await fetchImpl("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    })
    const data = (await res.json().catch(() => ({}))) as { hex?: unknown; error?: unknown }

    if (!res.ok) {
      return { ok: false, error: typeof data.error === "string" ? data.error : "Compile failed." }
    }
    if (typeof data.hex !== "string" || data.hex.length === 0) {
      return { ok: false, error: "The compile service returned no firmware." }
    }
    writeCache(key, data.hex)
    return { ok: true, hex: data.hex }
  } catch {
    return { ok: false, error: "Couldn't reach the compile service. Check your connection and try again." }
  }
}
