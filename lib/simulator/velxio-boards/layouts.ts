/*
 * Board layouts built from Velxio's pin/artwork geometry.
 *
 * Source: https://github.com/davidmonterocrespo24/velxio (AGPL-3.0) and Wokwi
 * @wokwi/elements (MIT). The raw coordinates live in velxio-board-data.ts;
 * this file only applies a per-board scale and (for Nano/Mega/ESP32) the same
 * quarter-turn rotation that the artwork gets, so pins stay on the pads.
 *
 * `scale` was chosen to keep each board at roughly the on-canvas size it had
 * before this change. Tune it here; pins and artwork scale together.
 */
import { VELXIO_BOARD_DATA } from "./velxio-board-data"

export type BoardRotation = 0 | 90 | -90

const SETTINGS: Record<string, { scale: number; rotate: BoardRotation }> = {
  "arduino-uno": { scale: 1.677, rotate: 0 },
  "arduino-nano": { scale: 1.379, rotate: 90 },
  "arduino-mega": { scale: 1.492, rotate: 90 },
  "esp32-devkit": { scale: 2.12, rotate: -90 },
  "esp32-c3": { scale: 1.116, rotate: 0 },
  "stm32-blue-pill": { scale: 1.07, rotate: 0 },
  "stm32-black-pill": { scale: 1.09, rotate: 0 },
  "raspberry-pi-pico": { scale: 1.17, rotate: 0 },
}

export interface VelxioBoardLayout {
  type: string
  width: number
  height: number
  /** Artwork box before rotation (what the <image> is sized to). */
  artWidth: number
  artHeight: number
  artSrc: string
  rotate: BoardRotation
  /** SVG transform that places the un-rotated artwork box into the board box. */
  artTransform: string | undefined
  scale: number
  pins: { name: string; velxioName: string; x: number; y: number }[]
  /** Map a point in Velxio's native frame (Wokwi px / Velxio px) to board coordinates. */
  toBoard: (x: number, y: number) => { x: number; y: number }
}

const r2 = (n: number) => Math.round(n * 100) / 100
const cache = new Map<string, VelxioBoardLayout | undefined>()

export function getVelxioBoardLayout(type: string): VelxioBoardLayout | undefined {
  if (cache.has(type)) return cache.get(type)
  const data = VELXIO_BOARD_DATA[type]
  const cfg = SETTINGS[type]
  if (!data || !cfg) {
    cache.set(type, undefined)
    return undefined
  }
  const s = cfg.scale
  const artWidth = r2(data.width * s)
  const artHeight = r2(data.height * s)
  const width = cfg.rotate === 0 ? artWidth : artHeight
  const height = cfg.rotate === 0 ? artHeight : artWidth
  const toBoard = (x: number, y: number) => {
    if (cfg.rotate === 90) return { x: r2(width - y * s), y: r2(x * s) }
    if (cfg.rotate === -90) return { x: r2(y * s), y: r2(height - x * s) }
    return { x: r2(x * s), y: r2(y * s) }
  }
  const artTransform =
    cfg.rotate === 90 ? `translate(${width}, 0) rotate(90)` : cfg.rotate === -90 ? `translate(0, ${height}) rotate(-90)` : undefined
  const layout: VelxioBoardLayout = {
    type,
    width,
    height,
    artWidth,
    artHeight,
    artSrc: data.art,
    rotate: cfg.rotate,
    artTransform,
    scale: s,
    pins: data.pins.map((p) => ({ name: p.name, velxioName: p.velxio, ...toBoard(p.x, p.y) })),
    toBoard,
  }
  cache.set(type, layout)
  return layout
}
