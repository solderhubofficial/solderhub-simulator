/**
 * Find the component pin under a screen point, looking *through* wire strokes.
 * Wires are drawn above components, so `elementFromPoint` returns a wire that merely
 * passes over a pin; the pin beneath must still be targetable.
 */
export function pinElementAt(clientX: number, clientY: number): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY)
  for (const el of stack) {
    const pin = el.closest("[data-pin-id]") as HTMLElement | null
    if (pin) return pin
  }
  return null
}

/** The wire whose body is under a screen point (the invisible wide hit stroke), if any. */
export function wireIdAt(clientX: number, clientY: number): string | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (el.getAttribute("data-wire-hit")) return el.getAttribute("data-wire-id")
  }
  return null
}
