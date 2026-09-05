"use client"

import { useEffect, useRef, useState } from "react"
import { SimulatorProvider } from "@/hooks/simulator/use-simulator-state"
import { useFullscreen } from "@/hooks/simulator/use-fullscreen"
import { SimulatorToolbar } from "@/components/simulator/toolbar"
import { ComponentsSidebar } from "@/components/simulator/sidebar-components"
import { PropertiesSidebar } from "@/components/simulator/sidebar-properties"
import { SimulatorCanvas } from "@/components/simulator/canvas/simulator-canvas"
import { ProjectLoader } from "@/components/simulator/project-loader"
import { ConsolePanel, type ProjectRequest } from "@/components/simulator/console-panel"
import { FirmwareRunner, type ActiveFirmware } from "@/components/simulator/firmware-runner"
import { StatusBar } from "@/components/simulator/status-bar"
import { KeyboardShortcuts } from "@/components/simulator/keyboard-shortcuts"
import { CodeEditorPanel } from "@/components/simulator/code-editor-panel"
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
  const [isPaletteOpen, setPaletteOpen] = useState(true)
  const [isPropertiesOpen, setPropertiesOpen] = useState(true)
  const [activeFirmware, setActiveFirmware] = useState<ActiveFirmware | null>(null)
  const [projectRequest, setProjectRequest] = useState<ProjectRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStreamingProject, setIsStreamingProject] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isCodeEditorOpen, setCodeEditorOpen] = useState(false)
  const requestTokenRef = useRef(0)

  const requestProject = (project: SimulatorProject) => {
    setLoadError(null)
    setCodeEditorOpen(false) // mutually exclusive with the code editor -- same screen slot
    requestTokenRef.current += 1
    setProjectRequest({ project, token: requestTokenRef.current })
  }

  const toggleCodeEditor = () => {
    setCodeEditorOpen((wasOpen) => {
      const next = !wasOpen
      if (next) {
        // opening Code closes the preset-project console -- they occupy
        // the same right-side slot and would otherwise stack.
        setProjectRequest(null)
      }
      return next
    })
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
        className="fixed inset-0 z-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background"
      >
        <SimulatorToolbar
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onTogglePalette={() => setPaletteOpen((v) => !v)}
          onToggleProperties={() => setPropertiesOpen((v) => !v)}
          paletteOpen={isPaletteOpen}
          propertiesOpen={isPropertiesOpen}
          onRequestProject={requestProject}
          isLoadingProject={isStreamingProject}
          onClearFirmware={() => {
            setActiveFirmware(null)
            setProjectRequest(null)
          }}
          onToggleCodeEditor={toggleCodeEditor}
          isCodeEditorOpen={isCodeEditorOpen}
        />

        <div className="relative flex min-h-0 flex-1">
          <ComponentsSidebar isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} />

          <main className="relative min-w-0 flex-1 isolate">
            <SimulatorCanvas
              onRequestProject={requestProject}
            />
            <PropertiesSidebar open={isPropertiesOpen} onClose={() => setPropertiesOpen(false)} />
            <ConsolePanel
              request={projectRequest}
              onFirmwareLoaded={setActiveFirmware}
              onError={setLoadError}
              onStreamingChange={setIsStreamingProject}
            />
            <CodeEditorPanel
              open={isCodeEditorOpen}
              onClose={() => setCodeEditorOpen(false)}
              onFirmwareLoaded={setActiveFirmware}
            />
          </main>
        </div>

        <StatusBar
          isLoadingProject={isStreamingProject}
          error={loadError}
          onClearError={() => setLoadError(null)}
          onToggleShortcuts={() => setShortcutsOpen((v) => !v)}
        />

        <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </SimulatorProvider>
  )
}
