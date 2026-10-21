/** Compute a viewport (pan + zoom) that frames every placed component. */

export interface FitBox { x: number; y: number; width: number; height: number; rotation?: number }

export interface FitOptions {
  /** Empty space kept around the circuit, in screen px. */
  padding?: number
  minZoom: number
  maxZoom: number
  /** Never zoom in past this when fitting (small circuits shouldn't become huge). */
  maxFitZoom?: number
}

export function computeFitViewport(
  boxes: ReadonlyArray<FitBox>,
  container: { width: number; height: number },
  { padding = 72, minZoom, maxZoom, maxFitZoom = 0.85 }: FitOptions,
): { x: number; y: number; zoom: number } | null {
  if (boxes.length === 0 || container.width <= 0 || container.height <= 0) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const b of boxes) {
    const r = ((b.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(r), sin = Math.sin(r)
    for (const [px, py] of [[0, 0], [b.width, 0], [0, b.height], [b.width, b.height]]) {
      const x = b.x + px * cos - py * sin
      const y = b.y + px * sin + py * cos
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }

  const w = Math.max(maxX - minX, 1)
  const h = Math.max(maxY - minY, 1)
  const availW = Math.max(container.width - padding * 2, 50)
  const availH = Math.max(container.height - padding * 2, 50)
  const zoom = Math.min(Math.max(Math.min(availW / w, availH / h, maxFitZoom), minZoom), maxZoom)

  return {
    zoom,
    x: container.width / 2 - ((minX + maxX) / 2) * zoom,
    y: container.height / 2 - ((minY + maxY) / 2) * zoom,
  }
}
