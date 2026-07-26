"use client"

import { useEffect, useRef, useState } from "react"
import { SimulatorProvider } from "@/hooks/simulator/use-simulator-state"
import { useFullscreen } from "@/hooks/simulator/use-fullscreen"
import { SimulatorToolbar } from "@/components/simulator/toolbar"
import { ComponentsSidebar } from "@/components/simulator/sidebar-components"
import { PropertiesSidebar } from "@/components/simulator/sidebar-properties"
import { SimulatorCanvas } from "@/components/simulator/canvas/simulator-canvas"
import { SimulationControls } from "@/components/simulator/canvas/simulation-controls"
import { ProjectLoader } from "@/components/simulator/project-loader"
import { ConsolePanel, type ProjectRequest } from "@/components/simulator/console-panel"
import { FirmwareRunner, type ActiveFirmware } from "@/components/simulator/firmware-runner"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"

export function SimulatorApp() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const rootRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef)
  const [isPaletteOpen, setPaletteOpen] = useState(false)
  const [activeFirmware, setActiveFirmware] = useState<ActiveFirmware | null>(null)

  // The project currently shown in the console panel. Persists after the
  // build finishes (unlike the old modal) — only cleared by Clear or by
  // requesting a different project.
  const [projectRequest, setProjectRequest] = useState<ProjectRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStreamingProject, setIsStreamingProject] = useState(false)
  const requestTokenRef = useRef(0)

  const requestProject = (project: SimulatorProject) => {
    setLoadError(null)
    requestTokenRef.current += 1
    setProjectRequest({ project, token: requestTokenRef.current })
  }

  return (
    <SimulatorProvider>
      <FirmwareRunner firmware={activeFirmware} />
      <ProjectLoader
        onRequestProject={requestProject}
        onUnknownProject={(id) => setLoadError(`Unknown project "${id}" in the link.`)}
      />
      <div
        ref={rootRef}
        className="fixed inset-0 z-0 flex h-screen w-screen flex-col overflow-hidden bg-background"
      >
        <SimulatorToolbar
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onTogglePalette={() => setPaletteOpen((v) => !v)}
          onRequestProject={requestProject}
          isLoadingProject={isStreamingProject}
          onClearFirmware={() => {
            setActiveFirmware(null)
            setProjectRequest(null)
          }}
        />
        <div className="relative flex min-h-0 flex-1">
          <ComponentsSidebar isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} />
          <div className="relative min-w-0 flex-1 isolate">
            <SimulatorCanvas />
            <PropertiesSidebar />
            <SimulationControls
              isLoadingProject={isStreamingProject}
              error={loadError}
              onClearError={() => setLoadError(null)}
            />
            <ConsolePanel
              request={projectRequest}
              onFirmwareLoaded={setActiveFirmware}
              onError={setLoadError}
              onStreamingChange={setIsStreamingProject}
            />
          </div>
        </div>
      </div>
    </SimulatorProvider>
  )
}
