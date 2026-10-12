/**
 * Short label for which board(s) are on the canvas, shown in the status bar.
 */
export function describeBoard(components: ReadonlyArray<{ type: string }>): string {
  const hasPi5 = components.some((component) => component.type === "raspberry-pi-5")
  const hasEsp32 = components.some((component) => component.type === "esp32-devkit")
  const hasAvr = components.some((component) => component.type === "arduino-uno")
  const labels = [
    ...(hasPi5 ? ["Pi 5"] : []),
    ...(hasEsp32 ? ["ESP32"] : []),
    ...(hasAvr ? ["AVR"] : []),
  ]
  return labels.length > 0 ? labels.join(" + ") : "No board"
}
