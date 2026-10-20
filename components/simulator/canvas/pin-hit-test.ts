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
