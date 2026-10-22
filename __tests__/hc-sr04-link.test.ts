import { describe, expect, it } from "vitest"
import { echoPulseMicroseconds, resolveHcSr04Links } from "@/lib/simulator/avr/hc-sr04-link"
import type { PlacedComponent, Wire } from "@/types/simulator"

const part = (id: string, type: string): PlacedComponent => ({ id, type, name: type, x: 0, y: 0, rotation: 0, metadata: {} })
const wire = (id: string, fromPinId: string, toPinId: string): Wire => ({ id, fromComponentId: fromPinId.split("_")[0], fromPinId, toComponentId: toPinId.split("_")[0], toPinId })

describe("HC-SR04 link resolution", () => {
  it("finds the Uno pins TRIG and ECHO are wired to", () => {
    const links = resolveHcSr04Links([part("uno", "arduino-uno"), part("hc", "hc-sr04")], [wire("a", "uno_D9", "hc_trig"), wire("b", "uno_D10", "hc_echo")], "uno")
    expect(links).toEqual([{ componentId: "hc", trigPin: "D9", echoPin: "D10" }])
  })
  it("follows a wire through a junction", () => {
    const links = resolveHcSr04Links([part("uno", "arduino-uno"), part("hc", "hc-sr04"), part("j", "junction")], [wire("a", "uno_D9", "j_P"), wire("a2", "j_P", "hc_trig"), wire("b", "uno_A0", "hc_echo")], "uno")
    expect(links).toEqual([{ componentId: "hc", trigPin: "D9", echoPin: "A0" }])
  })
  it("ignores a sensor that is not fully wired", () => {
    expect(resolveHcSr04Links([part("uno", "arduino-uno"), part("hc", "hc-sr04")], [wire("a", "uno_D9", "hc_trig")], "uno")).toEqual([])
  })
})

describe("HC-SR04 echo timing", () => {
  it("is about 58 microseconds per centimetre", () => {
    expect(echoPulseMicroseconds(100)).toBe(5831)
  })
  it("gives no echo outside the 2-400 cm range", () => {
    expect(echoPulseMicroseconds(1)).toBeNull()
    expect(echoPulseMicroseconds(401)).toBeNull()
  })
})
