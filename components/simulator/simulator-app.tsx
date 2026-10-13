"use client"

import { requestFitView } from "@/lib/simulator/fit-request"
import { useCallback, useEffect, useRef, useState } from "react"
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
import { PublicProjectsPanel } from "@/components/simulator/public-projects-panel"
import { SerialToolsPanel } from "@/components/simulator/serial-tools-panel"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"

/** Folds the parts drawer away when a simulation starts so the circuit gets the room. */
function PartsAutoHide({ onRunStart }: { onRunStart: () => void }) {
  const { state } = useSimulator()
  const wasRunning = useRef(false)
  useEffect(() => {
    if (state.isRunning && !wasRunning.current) onRunStart()
    wasRunning.current = state.isRunning
  }, [state.isRunning, onRunStart])
  return null
}

export function SimulatorApp() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
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
  const [codeInset, setCodeInset] = useState(0)
  const closeParts = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    const open = () => setPaletteOpen(true)
    window.addEventListener("simulator:open-parts", open)
    return () => window.removeEventListener("simulator:open-parts", open)
  }, [])

  // When a docked serial tool opens it covers the lower canvas -- re-frame the circuit into what's left.
  useEffect(() => {
    if (rightTool === "monitor" || rightTool === "plotter") requestFitView()
  }, [rightTool])

  // Errors are transient: clear them after a few seconds instead of leaving a red bar forever.
  useEffect(() => {
    if (!loadError) return
    const timer = window.setTimeout(() => setLoadError(null), 8000)
    return () => window.clearTimeout(timer)
  }, [loadError])
  const requestTokenRef = useRef(0)

  // Phones/tablets start with the parts drawer closed so the canvas is visible.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setPaletteOpen(false)
  }, [])

  const requestProject = (project: SimulatorProject) => {
    setLoadError(null)
    setCodeEditorOpen(false)
    requestTokenRef.current += 1
    setProjectRequest({ project, token: requestTokenRef.current })
  }

  const toggleCodeEditor = () => {
    setCodeEditorOpen((wasOpen) => {
      const next = !wasOpen
      if (next) setProjectRequest(null)
      return next
    })
  }

  return (
    <SimulatorProvider>
      <FirmwareRunner firmware={activeFirmware} />
      <PartsAutoHide onRunStart={closeParts} />
      <ProjectLoader onRequestProject={requestProject} onSavedFirmware={setActiveFirmware} onUnknownProject={(id, reason) => setLoadError(reason ? `Could not load project "${id}": ${reason}` : `Unknown project "${id}" in the link.`)} />
      <div ref={rootRef} className="fixed inset-0 z-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background">
        <SimulatorToolbar isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} onRequestProject={requestProject} onClearFirmware={() => { setActiveFirmware(null); setProjectRequest(null) }} onImportError={setLoadError} />
        <div className="relative flex min-h-0 flex-1">
          <SimulatorToolRail partsOpen={isPaletteOpen} activePanel={rightTool} codeOpen={isCodeEditorOpen} onToggleParts={() => setPaletteOpen((v) => !v)} onTogglePanel={(tool) => setRightTool((current) => current === tool ? null : tool)} onToggleCode={toggleCodeEditor} onOpenMyProjects={() => setMyProjectsOpen(true)} />
          <ComponentsSidebar isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} />
          <main className="relative min-w-0 flex-1 isolate">
            <div className="absolute inset-y-0 left-0" style={{ right: codeInset, bottom: rightTool === "monitor" || rightTool === "plotter" ? "min(42dvh, 320px)" : 0, }}><SimulatorCanvas /></div>
            <PropertiesSidebar open={rightTool === null} />
            {(rightTool === "monitor" || rightTool === "plotter") && <SerialToolsPanel mode={rightTool} onClose={() => setRightTool(null)} runtimeAvailable={Boolean(activeFirmware)} />}
            <ConsolePanel request={projectRequest} onFirmwareLoaded={setActiveFirmware} onError={setLoadError} onStreamingChange={setIsStreamingProject} />
            <CodeEditorPanel open={isCodeEditorOpen} onInsetChange={setCodeInset} onClose={() => setCodeEditorOpen(false)} onFirmwareLoaded={setActiveFirmware} />
            <style jsx global>{`
              main > aside.serial-dock {
                position: absolute !important;
                inset: auto 0 0 0 !important;
                z-index: 30 !important;
                height: min(42dvh, 320px) !important;
                width: 100% !important;
                max-width: none !important;
                border-left: 0 !important;
                border-top: 1px solid var(--border) !important;
                box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.14) !important;
              }
            `}</style>
          </main>
        </div>
        <StatusBar isLoadingProject={isStreamingProject} error={loadError} onClearError={() => setLoadError(null)} onToggleShortcuts={() => setShortcutsOpen((v) => !v)} />
        <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <MyProjectsPanel open={isMyProjectsOpen} onClose={() => setMyProjectsOpen(false)} onFirmwareLoaded={setActiveFirmware} />
        <PublicProjectsPanel />
      </div>
    </SimulatorProvider>
  )
}
