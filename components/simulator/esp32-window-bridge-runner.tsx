"use client"

import { useEffect } from "react"
import { useEsp32PinSink } from "@/hooks/simulator/use-esp32-pin-sink"
import type { Esp32BridgeMessage } from "@/lib/simulator/esp32/bridge-protocol"
import type { Esp32BoardType } from "@/lib/simulator/esp32/board-adapter"

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
 * Applies GPIO messages from a trusted emulator iframe to the existing simulator component state.
 * This runner is intentionally opt-in and must be mounted only after the embedded emulator is known
 * to emit the versioned SolderHub bridge protocol. The in-app Worker runtime
 * (`Esp32FirmwareRunner`) is the supported path; both share `useEsp32PinSink`.
 */
export function Esp32WindowBridgeRunner({
  boardComponentId,
  boardType,
  iframeWindow,
  iframeOrigin,
  enabled,
  onBridgeMessage,
}: Esp32WindowBridgeRunnerProps) {
  const active = enabled && Boolean(iframeWindow) && Boolean(iframeOrigin) && iframeOrigin !== "*"
  const consume = useEsp32PinSink({ boardComponentId, boardType, active })

  useEffect(() => {
    if (!active || !iframeWindow) return

    let expectedOrigin: string
    try {
      expectedOrigin = new URL(iframeOrigin).origin
    } catch {
      return
    }
    // Require a canonical origin rather than silently accepting paths.
    if (expectedOrigin !== iframeOrigin.replace(/\/$/, "")) return

    const handleMessage = (event: MessageEvent<unknown>) => {
      // Payload validation alone is not a trust boundary. Require both checks.
      if (event.source !== iframeWindow || event.origin !== expectedOrigin) return
      if (consume(event.data)) {
        const parsed = event.data as Esp32BridgeMessage
        onBridgeMessage?.(parsed)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [active, iframeWindow, iframeOrigin, consume, onBridgeMessage])

  return null
}
