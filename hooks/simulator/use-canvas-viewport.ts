"use client"

import { useCallback, useRef } from "react"
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "@/lib/simulator/constants"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

export function useCanvasViewport() {
  const { state, dispatch } = useSimulator()
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 })

  const zoomIn = useCallback(() => {
    dispatch({
      type: "SET_VIEWPORT",
      viewport: {
        zoom: Math.min(state.viewport.zoom + ZOOM_STEP, MAX_ZOOM),
      },
    })
  }, [dispatch, state.viewport.zoom])

  const zoomOut = useCallback(() => {
    dispatch({
      type: "SET_VIEWPORT",
      viewport: {
        zoom: Math.max(state.viewport.zoom - ZOOM_STEP, MIN_ZOOM),
      },
    })
  }, [dispatch, state.viewport.zoom])

  const resetView = useCallback(() => {
    dispatch({
      type: "SET_VIEWPORT",
      viewport: { x: 0, y: 0, zoom: 1 },
    })
  }, [dispatch])

  const handleWheel = useCallback(
    (e: React.WheelEvent, canvasRect: DOMRect) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      const newZoom = Math.min(Math.max(state.viewport.zoom + delta, MIN_ZOOM), MAX_ZOOM)

      const mouseX = e.clientX - canvasRect.left
      const mouseY = e.clientY - canvasRect.top
      const scale = newZoom / state.viewport.zoom

      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          zoom: newZoom,
          x: mouseX - (mouseX - state.viewport.x) * scale,
          y: mouseY - (mouseY - state.viewport.y) * scale,
        },
      })
    },
    [dispatch, state.viewport]
  )

  // Applies an absolute zoom level anchored to a screen-space focal point
  // (container-local coordinates). Used by two-finger pinch gestures on
  // touch devices, where the gesture reports a target zoom + midpoint each
  // frame rather than a wheel delta.
  const setZoomAtPoint = useCallback(
    (targetZoom: number, focalX: number, focalY: number) => {
      const newZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM)
      const scale = newZoom / state.viewport.zoom
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          zoom: newZoom,
          x: focalX - (focalX - state.viewport.x) * scale,
          y: focalY - (focalY - state.viewport.y) * scale,
        },
      })
    },
    [dispatch, state.viewport]
  )

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      isPanning.current = true
      panStart.current = {
        x: clientX,
        y: clientY,
        vx: state.viewport.x,
        vy: state.viewport.y,
      }
    },
    [state.viewport.x, state.viewport.y]
  )

  const movePan = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning.current) return
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          x: panStart.current.vx + (clientX - panStart.current.x),
          y: panStart.current.vy + (clientY - panStart.current.y),
        },
      })
    },
    [dispatch]
  )

  const endPan = useCallback(() => {
    isPanning.current = false
  }, [])

  return {
    viewport: state.viewport,
    zoomIn,
    zoomOut,
    resetView,
    handleWheel,
    setZoomAtPoint,
    startPan,
    movePan,
    endPan,
    isPanning,
  }
}
