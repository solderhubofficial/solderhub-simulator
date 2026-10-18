import { describe, expect, it, vi } from "vitest"
import { createEsp32GpioRuntimeAdapter } from "./gpio-runtime-adapter"

const gpio = (pin: number, level: 0 | 1) => ({
  channel: "solderhub:esp32-bridge",
  version: 1,
  type: "gpio",
  pin,
  level,
})

describe("createEsp32GpioRuntimeAdapter", () => {
  it("maps GPIO output events to the board header and emits immutable snapshots", () => {
    const onPinValues = vi.fn()
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      initialPinValues: { IO4: 1 },
      onPinValues,
    })

    expect(adapter.consume(gpio(2, 1))).toBe(true)
    expect(adapter.getPinValues()).toEqual({ IO4: 1, IO2: 1 })
    expect(onPinValues).toHaveBeenCalledWith({ IO4: 1, IO2: 1 })

    // Mutating a returned snapshot must not mutate adapter state.
    const snapshot = adapter.getPinValues()
    snapshot.IO2 = 0
    expect(adapter.getPinValues().IO2).toBe(1)
  })

  it("does not emit duplicate GPIO levels", () => {
    const onPinValues = vi.fn()
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      onPinValues,
    })

    expect(adapter.consume(gpio(2, 0))).toBe(true)
    expect(onPinValues).toHaveBeenLastCalledWith({ IO2: 0 })
    expect(adapter.consume(gpio(2, 1))).toBe(true)
    expect(adapter.consume(gpio(2, 1))).toBe(true)
    expect(onPinValues).toHaveBeenCalledTimes(2)
  })

  it("rejects invalid messages and pins not present on the board", () => {
    const onPinValues = vi.fn()
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      onPinValues,
    })

    expect(adapter.consume({ ...gpio(2, 1), version: 99 })).toBe(false)
    expect(adapter.consume(gpio(40, 1))).toBe(false)
    expect(adapter.getPinValues()).toEqual({})
    expect(onPinValues).not.toHaveBeenCalled()
  })

  it("forwards valid status and serial messages without changing pin values", () => {
    const onMessage = vi.fn()
    const onPinValues = vi.fn()
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-c3",
      onPinValues,
      onMessage,
    })

    expect(adapter.consume({
      channel: "solderhub:esp32-bridge",
      version: 1,
      type: "status",
      state: "running",
    })).toBe(true)
    expect(adapter.consume({
      channel: "solderhub:esp32-bridge",
      version: 1,
      type: "serial",
      port: "uart0",
      data: "hello",
    })).toBe(true)
    expect(onMessage).toHaveBeenCalledTimes(2)
    expect(onPinValues).not.toHaveBeenCalled()
  })

  it("resets state and publishes the new snapshot", () => {
    const onPinValues = vi.fn()
    const adapter = createEsp32GpioRuntimeAdapter({
      boardType: "esp32-devkit",
      onPinValues,
    })

    adapter.consume(gpio(2, 1))
    adapter.reset({ IO5: 0 })
    expect(adapter.getPinValues()).toEqual({ IO5: 0 })
    expect(onPinValues).toHaveBeenLastCalledWith({ IO5: 0 })
  })
})
