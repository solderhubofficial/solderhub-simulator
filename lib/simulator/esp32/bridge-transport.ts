import { parseEsp32BridgeMessage, type Esp32BridgeMessage } from "./bridge-protocol"

/**
 * Accept a bridge event only from the exact iframe window and origin selected
 * by the caller. Payload validation alone is not a security boundary.
 *
 * Call this only after the emulator is pinned, audited, and deliberately emits
 * the SolderHub bridge protocol. Never use "*" as expectedOrigin.
 */
export function parseTrustedEsp32BridgeEvent(
  event: Pick<MessageEvent<unknown>, "origin" | "source" | "data">,
  expectedSource: MessageEventSource | null,
  expectedOrigin: string,
): Esp32BridgeMessage | null {
  if (!expectedOrigin || expectedOrigin === "*") return null
  if (event.origin !== expectedOrigin) return null
  if (!expectedSource || event.source !== expectedSource) return null
  return parseEsp32BridgeMessage(event.data)
}
