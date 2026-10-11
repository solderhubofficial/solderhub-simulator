/**
 * Short label for which board(s) are on the canvas, shown in the status bar.
 *
 * The status bar used to hard-code "AVR", which was wrong as soon as an ESP32
 * DevKit was placed (it is an Xtensa chip, not AVR) and meaningless on an empty
 * canvas.
 */
export function describeBoard(components: ReadonlyArray<{ type: string }>): string {
  const hasEsp32 = components.some((c) => c.type === "esp32-devkit")
  const hasAvr = components.some((c) => c.type === "arduino-uno")

  if (hasEsp32 && hasAvr) return "ESP32 + AVR"
  if (hasEsp32) return "ESP32"
  if (hasAvr) return "AVR"
  return "No board"
}
