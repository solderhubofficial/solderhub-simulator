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
      {/* Minor grid */}
      <defs>
        <pattern
          id="sim-grid-minor"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth={0.5}
            opacity={0.4}
          />
        </pattern>
        <pattern
          id="sim-grid-major"
          width={gridSize * 5}
          height={gridSize * 5}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.6}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="var(--background)" />
      <rect width={width} height={height} fill="url(#sim-grid-minor)" />
      <rect width={width} height={height} fill="url(#sim-grid-major)" />
    </>
  )
}

export const GridBackground = memo(GridBackgroundInner)
