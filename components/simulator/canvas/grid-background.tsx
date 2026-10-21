"use client"

import { memo } from "react"
import { GRID_SIZE } from "@/lib/simulator/constants"

interface GridBackgroundProps {
  viewport: { x: number; y: number; zoom: number }
  width: number
  height: number
}

function GridBackgroundInner({ viewport, width, height }: GridBackgroundProps) {
  const gridSize = GRID_SIZE * viewport.zoom
  const offsetX = viewport.x % gridSize
  const offsetY = viewport.y % gridSize

  return (
    <>
      <defs>
        <pattern
          id="sim-grid-minor"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <circle
            cx={gridSize / 2}
            cy={gridSize / 2}
            r={1.1}
            fill="var(--canvas-grid)"
            opacity={0.55}
          />
        </pattern>
        <radialGradient id="sim-canvas-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="var(--canvas-bg)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--canvas-bg)" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="var(--canvas-bg)" />
      <rect width={width} height={height} fill="url(#sim-grid-minor)" />
      <rect width={width} height={height} fill="url(#sim-canvas-vignette)" pointerEvents="none" />
    </>
  )
}

export const GridBackground = memo(GridBackgroundInner)
