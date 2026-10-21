"use client"

import { hasBoard } from "@/lib/simulator/board-label"
import { requestFitView } from "@/lib/simulator/fit-request"
import { useCallback, useEffect, useRef, useState } from "react"
import { SimulatorProvider, useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useFullscreen } from "@/hooks/simulator/use-fullscreen"
import { SimulatorToolbar } from "@/components/simulator/toolbar"
import { ComponentsSidebar } from "@/components/simulator/sidebar-components"
import { SimulatorCanvas } from "@/components/simulator/canvas/simulator-canvas"
import { ThreeDWorkbench } from "@/components/simulator/three-d-workbench"
import { ProjectLoader } from "@/components/simulator/project-loader"
import { ConsolePanel, type ProjectRequest } from "@/components/simulator/console-panel"
import { FirmwareRunner, type ActiveFirmware } from "@/components/simulator/firmware-runner"
import { Esp32FirmwareRunner, type ActiveEsp32Firmware } from "@/components/simulator/esp32-firmware-runner"
import type { Esp32RuntimeStatus } from "@/lib/simulator/esp32/runtime-protocol"
import { StartScreen } from "@/components/simulator/start-screen"
import { MobileNav } from "@/components/simulator/mobile-nav"
import { BottomDock } from "@/components/simulator/bottom-dock"
import { KeyboardShortcuts } from "@/components/simulator/keyboard-shortcuts"
import { CodeEditorPanel, type ConsoleTab } from "@/components/simulator/code-editor-panel"
import { useSerialLog } from "@/hooks/simulator/use-serial-log"
import { SimulatorToolRail, type RightTool } from "@/components/simulator/tool-rail"
import { MyProjectsPanel } from "@/components/simulator/my-projects-panel"
import { PublicProjectsPanel } from "@/components/simulator/public-projects-panel"
import { SerialToolsPanel } from "@/components/simulator/serial-tools-panel"
import { CircuitCheckPanel } from "@/components/simulator/circuit-check-panel"
import type { SimulatorProject } from "@/lib/simulator/firmware/projects"

/** Run / Stop control for the compact embed view (the status bar that normally hosts it is hidden). */
function EmbedRunButton() {
  const { state, dispatch } = useSimulator()
  const canRun = hasBoard(state.components)
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "SET_RUNNING", isRunning: !state.isRunning })}
      disabled={!state.isRunning && !canRun}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 ${state.isRunning ? "bg-status-running text-white" : "bg-card text-foreground border border-border hover:border-primary/50"}`}
    >
      {state.isRunning ? "■ Stop" : "▶ Run"}
    </button>
  )
}

/** Re-frames the circuit when a docked panel (code editor, monitor) opens or closes, so it is never left hidden behind it. */
function FitOnPanelChange({ panelKey }: { panelKey: string }) {
  const { state } = useSimulator()
  const hasParts = state.components.length > 0
  const hasPartsRef = useRef(hasParts)
  hasPartsRef.current = hasParts
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const timer = window.setTimeout(() => { if (hasPartsRef.current) requestFitView() }, 260)
    return () => window.clearTimeout(timer)
  }, [panelKey])
  return null
}

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
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d")
  const [rightTool, setRightTool] = useState<RightTool>(null)
  // ?embed=1 -> compact view for iframes (articles): canvas + run + serial only.
  const [embed, setEmbed] = useState(false)
  const [fullUrl, setFullUrl] = useState("https://simulator.solderhub.com/")
  const [isMyProjectsOpen, setMyProjectsOpen] = useState(false)
  const [activeFirmware, setActiveFirmware] = useState<ActiveFirmware | null>(null)
  const [esp32Firmware, setEsp32Firmware] = useState<ActiveEsp32Firmware | null>(null)
  const [esp32Status, setEsp32Status] = useState<Esp32RuntimeStatus>({ state: "idle" })
  const [projectRequest, setProjectRequest] = useState<ProjectRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isStreamingProject, setIsStreamingProject] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [isCodeEditorOpen, setCodeEditorOpen] = useState(false)
  const [codeInset, setCodeInset] = useState(0)
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("output")
  const serial = useSerialLog()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("embed") !== "1") return
    setEmbed(true)
    setPaletteOpen(false)
    params.delete("embed")
    const rest = params.toString()
    setFullUrl(`https://simulator.solderhub.com/${rest ? `?${rest}` : ""}`)
  }, [])
  const closeParts = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    const open = () => setPaletteOpen(true)
    const collapse = () => setPaletteOpen(false)
    window.addEventListener("simulator:open-parts", open)
    window.addEventListener("simulator:prebuilt-project-loaded", collapse)
    return () => {
      window.removeEventListener("simulator:open-parts", open)
      window.removeEventListener("simulator:prebuilt-project-loaded", collapse)
    }
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
    closeParts()
    setLoadError(null)
    setCodeEditorOpen(false)
    requestTokenRef.current += 1
    setProjectRequest({ project, token: requestTokenRef.current })
  }

  const toggleCodeEditor = () => {
    setCodeEditorOpen((wasOpen) => {
      const next = !wasOpen
      if (next) {
        setPaletteOpen(false)
        setProjectRequest(null)
        // The serial monitor moves under the code while the editor is open.
        setRightTool((current) => (current === "monitor" ? null : current))
      }
      return next
    })
  }

  const handleTogglePanel = (tool: Exclude<RightTool, null>) => {
            // With the code editor open the serial monitor lives under the code (like the IDE); otherwise it docks.
            if (tool === "monitor" && isCodeEditorOpen) { setConsoleTab("serial"); return }
            if (tool === "check") setCodeEditorOpen(false)
            setRightTool((current) => current === tool ? null : tool)
          }

  return (
    <SimulatorProvider>
      <FirmwareRunner firmware={activeFirmware} />
      <Esp32FirmwareRunner firmware={esp32Firmware} onStatus={setEsp32Status} />
      <FitOnPanelChange panelKey={`${isCodeEditorOpen}-${rightTool}`} />
      <PartsAutoHide onRunStart={closeParts} />
      <ProjectLoader onRequestProject={requestProject} onSavedFirmware={setActiveFirmware} onUnknownProject={(id, reason) => setLoadError(reason ? `Could not load project "${id}": ${reason}` : `Unknown project "${id}" in the link.`)} />
      <div ref={rootRef} className="fixed inset-0 z-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-background">
        {!embed && <SimulatorToolbar isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} onRequestProject={requestProject} onClearFirmware={() => { setActiveFirmware(null); setEsp32Firmware(null); setProjectRequest(null) }} onImportError={setLoadError} viewMode={viewMode} onViewModeChange={setViewMode} isLoadingProject={isStreamingProject} error={loadError} onClearError={() => setLoadError(null)} />}
        <div className="relative flex min-h-0 flex-1">
          {!embed && <SimulatorToolRail partsOpen={isPaletteOpen} codeOpen={isCodeEditorOpen} onToggleParts={() => setPaletteOpen((v) => !v)} onToggleCode={toggleCodeEditor} onOpenMyProjects={() => setMyProjectsOpen(true)} onOpenHelp={() => setShortcutsOpen(true)} />}
          {!embed && <ComponentsSidebar isOpen={isPaletteOpen} onClose={() => setPaletteOpen(false)} />}
          <main className="relative min-w-0 flex-1 isolate">
            <div className="absolute inset-y-0 left-0" style={{ right: codeInset, bottom: rightTool === "monitor" || rightTool === "plotter" ? "min(42dvh, 320px)" : 0, }}>{viewMode === "3d" ? <ThreeDWorkbench /> : <SimulatorCanvas />}</div>
            {!embed && viewMode === "2d" && <StartScreen />}
            {embed && (
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <EmbedRunButton />
                <button
                  type="button"
                  onClick={() => setRightTool((current) => (current === "monitor" ? null : "monitor"))}
                  aria-pressed={rightTool === "monitor"}
                  className="rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur hover:border-primary/50"
                >
                  Serial Monitor
                </button>
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                >
                  Open full simulator ↗
                </a>
              </div>
            )}
            {rightTool === "check" && <CircuitCheckPanel onClose={() => setRightTool(null)} />}
            {(rightTool === "monitor" || rightTool === "plotter") && <SerialToolsPanel mode={rightTool} onClose={() => setRightTool(null)} runtimeAvailable={Boolean(activeFirmware) || Boolean(esp32Firmware)} serial={serial} />}
            <ConsolePanel request={projectRequest} onFirmwareLoaded={setActiveFirmware} onError={setLoadError} onStreamingChange={setIsStreamingProject} />
            <CodeEditorPanel open={isCodeEditorOpen} onInsetChange={setCodeInset} onClose={() => setCodeEditorOpen(false)} onFirmwareLoaded={setActiveFirmware} serial={serial} runtimeAvailable={Boolean(activeFirmware) || Boolean(esp32Firmware)} tab={consoleTab} onTabChange={setConsoleTab} esp32Firmware={esp32Firmware} esp32Status={esp32Status} onEsp32Compiled={(firmware) => setEsp32Firmware((previous) => ({ ...firmware, runId: previous?.runId ?? 0 }))} onEsp32Reset={() => setEsp32Firmware((previous) => (previous ? { ...previous, runId: previous.runId + 1 } : previous))} />
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
        {!embed && <BottomDock activePanel={rightTool} consoleOpen={isCodeEditorOpen && consoleTab === "output"} lastLine={serial.lines[serial.lines.length - 1]} error={loadError} isLoadingProject={isStreamingProject} onClearError={() => setLoadError(null)} onToggleConsole={() => { if (isCodeEditorOpen && consoleTab === "output") { setCodeEditorOpen(false); return } setConsoleTab("output"); if (!isCodeEditorOpen) toggleCodeEditor() }} onTogglePanel={handleTogglePanel} />}
        {!embed && <MobileNav
          view={isCodeEditorOpen ? "code" : rightTool === "monitor" ? "monitor" : "circuit"}
          onCircuit={() => { setCodeEditorOpen(false); setRightTool(null) }}
          onCode={() => { if (!isCodeEditorOpen) toggleCodeEditor() }}
          onMonitor={() => { setCodeEditorOpen(false); setRightTool("monitor") }}
          onExamples={() => window.dispatchEvent(new CustomEvent("simulator:open-public-projects"))}
          onAddPart={() => setPaletteOpen(true)}
        />}
        <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <MyProjectsPanel open={isMyProjectsOpen} onClose={() => setMyProjectsOpen(false)} onFirmwareLoaded={setActiveFirmware} />
        <PublicProjectsPanel />
      </div>
    </SimulatorProvider>
  )
}
