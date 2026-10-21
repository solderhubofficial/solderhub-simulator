"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type Offset = { x: number; y: number }

function read(key: string): Offset {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<Offset> | null
    if (v && typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y }
  } catch { /* convenience only */ }
  return { x: 0, y: 0 }
}

/**
 * Lets a floating bar be dragged by a grip. The bar keeps its normal anchor and the user's drag is stored as an
 * offset from it (persisted), so it never ends up outside its container. Double-click the grip to put it back.
 */
export function useDragOffset(storageKey: string, getElement: () => HTMLElement | null) {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ px: number; py: number; ox: number; oy: number; minX: number; maxX: number; minY: number; maxY: number } | null>(null)
  const latest = useRef(offset)
  latest.current = offset

  useEffect(() => { setOffset(read(storageKey)) }, [storageKey])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const el = getElement()
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) return
    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
    const rect = el.getBoundingClientRect()
    const box = parent.getBoundingClientRect()
    start.current = {
      px: event.clientX, py: event.clientY, ox: latest.current.x, oy: latest.current.y,
      minX: box.left + 4 - rect.left, maxX: box.right - 4 - rect.right,
      minY: box.top + 4 - rect.top, maxY: box.bottom - 4 - rect.bottom,
    }
    setDragging(true)
  }, [getElement])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = Math.min(Math.max(event.clientX - s.px, s.minX), Math.max(s.minX, s.maxX))
    const dy = Math.min(Math.max(event.clientY - s.py, s.minY), Math.max(s.minY, s.maxY))
    setOffset({ x: s.ox + dx, y: s.oy + dy })
  }, [])

  const end = useCallback((event: React.PointerEvent) => {
    if (!start.current) return
    start.current = null
    setDragging(false)
    const el = event.currentTarget as Element
    if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId)
    try { window.localStorage.setItem(storageKey, JSON.stringify(latest.current)) } catch { /* convenience only */ }
  }, [storageKey])

  const reset = useCallback(() => {
    setOffset({ x: 0, y: 0 })
    try { window.localStorage.removeItem(storageKey) } catch { /* convenience only */ }
  }, [storageKey])

  return {
    offset,
    dragging,
    gripProps: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onDoubleClick: reset },
  }
}
