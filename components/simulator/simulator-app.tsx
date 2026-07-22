"use client"

import { useEffect } from "react"
import { SimulatorProvider } from "@/hooks/simulator/use-simulator-state"
import { SimulatorToolbar } from "@/components/simulator/toolbar"
import { ComponentsSidebar } from "@/components/simulator/sidebar-components"
import { PropertiesSidebar } from "@/components/simulator/sidebar-properties"
import { SimulatorCanvas } from "@/components/simulator/canvas/simulator-canvas"

export function SimulatorApp() {
  // Lock page-level scrolling while the simulator is mounted. Without this,
  // any extra height from global chrome (cookie banner, feedback widget,
  // etc.) can push the document taller than 100vh — scrolling *that* then
  // makes the absolutely-positioned canvas and the floating properties
  // panel drift out of sync, so placed components appear to slide under
  // the panel. Locking body scroll makes the simulator a true fixed
  // full-screen surface, which removes the drift entirely.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <SimulatorProvider>
      <div className="fixed inset-0 z-0 flex h-screen w-screen flex-col overflow-hidden bg-background">
        <SimulatorToolbar />
        <div className="flex min-h-0 flex-1">
          <ComponentsSidebar />
          <div className="relative min-w-0 flex-1 isolate">
            <SimulatorCanvas />
            <PropertiesSidebar />
          </div>
        </div>
      </div>
    </SimulatorProvider>
  )
}
