"use client"

import { useEffect } from "react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import {
  createEsp32GpioRuntimeAdapter,
} from "@/lib/simulator/esp32/gpio-runtime-adapter"
import type {
  Esp32BridgeMessage,
} from "@/lib/simulator/esp32/bridge-protocol"
import type { Esp32BoardType } from "@/lib/simulator/esp32/gpio-canvas-adapter"

export interface Esp32WindowBridgeRunnerProps {
  /** ID of the placed ESP32 board whose metadata drives circuit simulation. */
  boardComponentId: string
  boardType: Esp32BoardType
  /** Exact Window object for the trusted emulator iframe, never a guessed source. */
  iframeWindow: Window | null
  /** Exact expected iframe origin, including scheme and port if present. */
  iframeOrigin: string
  enabled: boolean
  onBridgeMessage?: (message: Esp32BridgeMessage) => void
}

/**
 * Applies GPIO messages from a trusted emulator iframe to the existing
 * simulator component state. This runner is intentionally opt-in and must be
 * mounted only after the embedded emulator is known to emit the versioned
 * SolderHub bridge protocol.
 */
export function Esp32WindowBridgeRunner({
  boardComponentId,
  boardType,
  iframeWindow,
  iframeOrigin,
  enabled,
  onBridgeMessage,
}: Esp32WindowBridgeRunnerProps) {
  const { dispatch } = useSimulator()

  useEffect(() => {
    if (!enabled || !iframeWindow || !iframeOrigin || iframeOrigin === "*") return

    let expectedOrigin: string
    try {
      expectedOrigin = new URL(iframeOrigin).origin
    } catch {
      return
    }

    if (expectedOrigin !== iframeOrigin.replace(/\/$/, "")) {
      // Require a canonical origin rather than silently accepting paths.
      return
    }

    const adapter = createEsp32GpioRuntimeAdapter({
      boardType,
      onPinValues: (pinValues) => {
        dispatch({
          type: "UPDATE_METADATA",
          id: boardComponentId,
          metadata: { pinValues },
        })
      },
      onMessage: onBridgeMessage,
    })

    const handleMessage = (event: MessageEvent<unknown>) => {
      // Payload validation alone is not a trust boundary. Require both checks.
      if (event.source !== iframeWindow || event.origin !== expectedOrigin) return
      adapter.consume(event.data)
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [enabled, iframeWindow, iframeOrigin, boardComponentId, boardType, dispatch, onBridgeMessage])

  return null
}
