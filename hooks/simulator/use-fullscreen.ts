"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    setIsSupported(typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen))
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      targetRef.current?.requestFullscreen?.().catch(() => {
        // Ignore — some browsers reject without a direct user gesture edge case.
      })
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [targetRef])

  return { isFullscreen, isSupported, toggleFullscreen }
}
