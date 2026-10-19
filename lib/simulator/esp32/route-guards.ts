/** Best-effort abuse guards for the compile route. Serverless instances do not share memory, so the
 *  build service enforces its own limits as the real backstop; these stop casual hammering early. */

export interface RateLimiter {
  allow(key: string, now?: number): boolean
}

/** Fixed-window limiter with bounded memory (old windows are pruned). */
export function createRateLimiter(options: { windowMs: number; max: number; maxKeys?: number }): RateLimiter {
  const { windowMs, max, maxKeys = 5_000 } = options
  const hits = new Map<string, { windowStart: number; count: number }>()
  return {
    allow(key, now = Date.now()) {
      const entry = hits.get(key)
      if (!entry || now - entry.windowStart >= windowMs) {
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (now - v.windowStart >= windowMs) hits.delete(k)
          if (hits.size >= maxKeys) return false // under attack from many keys: fail closed
        }
        hits.set(key, { windowStart: now, count: 1 })
        return true
      }
      if (entry.count >= max) return false
      entry.count += 1
      return true
    },
  }
}

export interface ConcurrencyLimiter {
  /** Returns a release function, or null when the limit is reached. Release is idempotent. */
  tryAcquire(): (() => void) | null
  inFlight(): number
}

export function createConcurrencyLimiter(max: number): ConcurrencyLimiter {
  let active = 0
  return {
    tryAcquire() {
      if (active >= max) return null
      active += 1
      let released = false
      return () => {
        if (released) return
        released = true
        active -= 1
      }
    },
    inFlight: () => active,
  }
}

/** Reject browser requests that come from a different site (CSRF / quota theft). Non-browser clients send no Origin. */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true
  if (!host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** The build service URL must be https, or plain http only for a local development service. */
export function parseServiceUrl(value: string | undefined): URL | null {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]"
  if (url.protocol === "https:" || (url.protocol === "http:" && local)) return url
  return null
}
