import { describe, expect, it } from "vitest"
import { createConcurrencyLimiter, createRateLimiter, isSameOrigin, parseServiceUrl } from "./route-guards"

describe("createRateLimiter", () => {
  it("allows up to max per window then resets", () => {
    const l = createRateLimiter({ windowMs: 1000, max: 2 })
    expect([l.allow("a", 0), l.allow("a", 1), l.allow("a", 2)]).toEqual([true, true, false])
    expect(l.allow("b", 3)).toBe(true)
    expect(l.allow("a", 1001)).toBe(true)
  })
  it("fails closed when too many distinct keys are active", () => {
    const l = createRateLimiter({ windowMs: 1000, max: 5, maxKeys: 2 })
    expect([l.allow("a", 0), l.allow("b", 0), l.allow("c", 0)]).toEqual([true, true, false])
    expect(l.allow("c", 2000)).toBe(true)
  })
})

describe("createConcurrencyLimiter", () => {
  it("caps in-flight work and release is idempotent", () => {
    const c = createConcurrencyLimiter(1)
    const release = c.tryAcquire()!
    expect(c.tryAcquire()).toBeNull()
    release(); release()
    expect(c.inFlight()).toBe(0)
    expect(c.tryAcquire()).not.toBeNull()
  })
})

describe("isSameOrigin", () => {
  it("accepts matching hosts and missing Origin, rejects others", () => {
    expect(isSameOrigin(null, "x.com")).toBe(true)
    expect(isSameOrigin("https://x.com", "x.com")).toBe(true)
    expect(isSameOrigin("https://evil.com", "x.com")).toBe(false)
    expect(isSameOrigin("not a url", "x.com")).toBe(false)
    expect(isSameOrigin("https://x.com", null)).toBe(false)
  })
})

describe("parseServiceUrl", () => {
  it("requires https except for localhost", () => {
    expect(parseServiceUrl("https://build.example.com")).not.toBeNull()
    expect(parseServiceUrl("http://localhost:8787")).not.toBeNull()
    expect(parseServiceUrl("http://127.0.0.1:8787")).not.toBeNull()
    expect(parseServiceUrl("http://build.example.com")).toBeNull()
    expect(parseServiceUrl("ftp://x")).toBeNull()
    expect(parseServiceUrl("garbage")).toBeNull()
    expect(parseServiceUrl(undefined)).toBeNull()
  })
})
