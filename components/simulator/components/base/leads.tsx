"use client"

/**
 * Metal lead / header-pin strips.
 *
 * These are drawn as thin <rect>s rather than <line>s on purpose: an SVG
 * gradient that uses the default objectBoundingBox units silently fails on a
 * perfectly horizontal or vertical <line> (its bounding box has zero height or
 * width), so a "shaded" lead drawn that way renders as nothing at all. A rect
 * has a real bounding box, so the metallic gradient always shows.
 */

type LeadKind = "steel" | "gold"

interface LeadVProps {
  x: number
  y1: number
  y2: number
  w?: number
  kind?: LeadKind
}

/** Vertical lead centred on `x`, running between y1 and y2. */
export function LeadV({ x, y1, y2, w = 2, kind = "steel" }: LeadVProps) {
  const top = Math.min(y1, y2)
  return (
    <rect
      x={x - w / 2}
      y={top}
      width={w}
      height={Math.abs(y2 - y1)}
      rx={Math.min(0.6, w / 4)}
      fill={`url(#sim-${kind === "gold" ? "gold" : "lead"}-v)`}
    />
  )
}

interface LeadHProps {
  x1: number
  x2: number
  y: number
  w?: number
  kind?: LeadKind
}

/** Horizontal lead centred on `y`, running between x1 and x2. */
export function LeadH({ x1, x2, y, w = 2, kind = "steel" }: LeadHProps) {
  const left = Math.min(x1, x2)
  return (
    <rect
      x={left}
      y={y - w / 2}
      width={Math.abs(x2 - x1)}
      height={w}
      rx={Math.min(0.6, w / 4)}
      fill={`url(#sim-${kind === "gold" ? "gold" : "lead"}-h)`}
    />
  )
}
