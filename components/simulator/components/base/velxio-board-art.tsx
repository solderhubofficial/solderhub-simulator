"use client"

import type { VelxioBoardLayout } from "@/lib/simulator/velxio-boards/layouts"

/** Draws a board's Velxio artwork at the exact box its pin coordinates were scaled to. */
export function VelxioBoardArt({ layout }: { layout: VelxioBoardLayout }) {
  const image = <image href={layout.artSrc} x="0" y="0" width={layout.artWidth} height={layout.artHeight} preserveAspectRatio="none" />
  return layout.artTransform ? <g transform={layout.artTransform}>{image}</g> : image
}
