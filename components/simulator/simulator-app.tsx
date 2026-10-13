"use client"

import { useEffect, useRef, useState } from "react"
import { SimulatorProvider, useSimulator } from "@/hooks/simulator/use-simulator-state"
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
import { SimulatorToolRail, type RightTool } from "@/components/simulator/tool-rail"
import { MyProjectsPanel } from "@/components/simulator/my-projects-panel"
import { SerialToolsPanel } from "@/components/simulator/serial-tools-panel"
import { EmbedChrome } from "@/components/simulator/embed-chrome"
import { fitViewport } from "@/lib/simulator/firmware/circuit"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"
import type { PlacedComponent } from "@/types/simulator"

export function SimulatorApp() {
  return (
    <SimulatorProvider>
      <SimulatorShell />
    </SimulatorProvider>
  )
}

/** Width the build-log / source panel covers on wider screens when a project loads. */
const CONSOLE_PANEL_INSET = 400

function SimulatorShell() {
  const { dispatch } = useSimulator()
  // null until the URL has been read, so an embedded frame never flashes the
  // full editor UI before switching to the minimal one.
  const [isEmbed, setIsEmbed] = useState<boolean | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [activeProject, setActiveProject] = useState<SimulatorProject | null>(null)

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("embed")
    setIsEmbed(flag === "1" || flag === "true")
  }, [])

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
  const [rightTool, setRightTool] = useState<RightTool>(null)
  const [isMyProjectsOpen, setMyProjectsOpen] = useState(false)
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
    setActiveProject(project)
    setProjectRequest({ project, token: requestTokenRef.current })
  }

  // After a project's parts land on the canvas, centre and scale the view so
  // the whole circuit is visible (the board alone used to fit the default
  // viewport; a full circuit may not, and an embedded frame is much smaller).
  const handleProjectPlaced = (components: PlacedComponent[]) => {
    requestAnimationFrame(() => {
      const el = mainRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const embedded = isEmbedRef.current
      const rightInset = !embedded && rect.width >= 900 ? CONSOLE_PANEL_INSET : 24
      const viewport = fitViewport(components, rect.width, rect.height, {
        top: 24,
        left: 24,
        right: rightInset,
        bottom: embedded ? 64 : 24, // room for the embed controls
      })
      if (viewport) dispatch({ type: "SET_VIEWPORT", viewport })
    })
  }
  const isEmbedRef = useRef(false)
  isEmbedRef.current = isEmbed === true

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

  if (isEmbed === null) {
    return <div className="fixed inset-0 bg-background" />
  }

  return (
    <>
      <FirmwareRunner firmware={activeFirmware} />
      <ProjectLoader
        onRequestProject={requestProject}
        onUnknownProject={(id) => setLoadError(`Unknown project "${id}" in the link.`)}
      />
      <div
        ref={rootRef}
        className="fixed inset-0 z-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background"
      >
        {!isEmbed && (
          <SimulatorToolbar
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onRequestProject={requestProject}
            onClearFirmware={() => {
              setActiveFirmware(null)
              setProjectRequest(null)
            }}
            onImportError={setLoadError}
          />
        )}

        <div className="relative flex min-h-0 flex-1">
          {!isEmbed && (
            <>
              <SimulatorToolRail
                partsOpen={isPaletteOpen}
                activePanel={rightTool}
                codeOpen={isCodeEditorOpen}
                onToggleParts={() => setPaletteOpen((v) => !v)}
                onTogglePanel={(tool) => setRightTool((current) => current === tool ? null : tool)}
                onToggleCode={toggleCodeEditor}
                onOpenMyProjects={() => setMyProjectsOpen(true)}
              />
              <ComponentsSidebar isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} />
            </>
          )}

          <main ref={mainRef} className="relative min-w-0 flex-1 isolate">
            <SimulatorCanvas />
            {!isEmbed && (
              <>
                {/* Inspector for the selected part/wire; hidden while a serial panel owns the right slot. */}
                <PropertiesSidebar open={rightTool === null} />
                {(rightTool === "monitor" || rightTool === "plotter") && (
                  <SerialToolsPanel mode={rightTool} onClose={() => setRightTool(null)} runtimeAvailable={Boolean(activeFirmware)} />
                )}
              </>
            )}
            <ConsolePanel
              request={projectRequest}
              onFirmwareLoaded={setActiveFirmware}
              onError={setLoadError}
              onStreamingChange={setIsStreamingProject}
              onProjectPlaced={handleProjectPlaced}
              headless={isEmbed}
            />
            {!isEmbed && (
              <CodeEditorPanel
                open={isCodeEditorOpen}
                onClose={() => setCodeEditorOpen(false)}
                onFirmwareLoaded={setActiveFirmware}
              />
            )}
            {isEmbed && (
              <EmbedChrome project={activeProject} error={loadError} onClearError={() => setLoadError(null)} />
            )}
          </main>
        </div>

        {!isEmbed && (
          <>
            <StatusBar
              isLoadingProject={isStreamingProject}
              error={loadError}
              onClearError={() => setLoadError(null)}
              onToggleShortcuts={() => setShortcutsOpen((v) => !v)}
            />

            <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <MyProjectsPanel open={isMyProjectsOpen} onClose={() => setMyProjectsOpen(false)} />
          </>
        )}
      </div>
    </>
  )
}
