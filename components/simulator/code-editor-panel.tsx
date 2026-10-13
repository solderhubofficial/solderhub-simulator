"use client"

import { useEffect, useRef, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { cpp } from "@codemirror/lang-cpp"
import { oneDark } from "@codemirror/theme-one-dark"
import { X, Play, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"

const DEFAULT_SKETCH = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`

const STORAGE_KEY = "solderhub-simulator:sketch-draft"
const ACTIVE_PROJECT_KEY = "solderhub-simulator:active-project-id"
const PROJECT_ITEM_API = "https://www.solderhub.com/api/simulator/project-item"
const AVR_COMPILER_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AVR_COMPILER === "1"

interface CodeEditorPanelProps {
  open: boolean
  onInsetChange: (inset: number) => void
  onClose: () => void
  onFirmwareLoaded: (firmware: ActiveFirmware) => void
}

export function CodeEditorPanel({ open, onInsetChange, onClose, onFirmwareLoaded }: CodeEditorPanelProps) {
  const { state, dispatch } = useSimulator()
  const { theme } = useTheme()
  const [source, setSource] = useState(DEFAULT_SKETCH)
  const [isCompiling, setIsCompiling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(560)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)

  useEffect(() => {
    onInsetChange(open ? panelWidth : 0)
    return () => onInsetChange(0)
  }, [open, panelWidth, onInsetChange])

  useEffect(() => {
    if (!isResizing) return
    const handlePointerMove = (event: PointerEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      const nextWidth = Math.max(320, Math.min(window.innerWidth * 0.82, start.width + start.x - event.clientX))
      setPanelWidth(nextWidth)
    }
    const handlePointerUp = () => {
      resizeStartRef.current = null
      setIsResizing(false)
    }
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [isResizing])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setSource(saved)
    } catch { /* Local drafts are optional. */ }
    const handleLoadSketch = (event: Event) => {
      const nextSource = (event as CustomEvent<unknown>).detail
      if (typeof nextSource === "string") setSource(nextSource)
    }
    window.addEventListener("solderhub:load-sketch", handleLoadSketch)
    return () => window.removeEventListener("solderhub:load-sketch", handleLoadSketch)
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, source) } catch { /* Ignore unavailable browser storage. */ }
  }, [source])

  if (!open) return null

  const unoBoard = state.components.find((c) => c.type === "arduino-uno")
  const esp32Board = state.components.find((c) => c.type === "esp32-devkit")

  const handleRun = async (currentSource: string) => {
    setError(null)
    if (!unoBoard) {
      setError(esp32Board
        ? "Custom code currently only runs on Arduino Uno — ESP32 support is coming soon. Add a Uno to the canvas to try this out."
        : "Place an Arduino Uno on the canvas before running your code.")
      return
    }

    setIsCompiling(true)
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: currentSource }),
      })
      const data = await res.json()
      if (!res.ok || typeof data.hex !== "string") {
        setError(typeof data.error === "string" ? data.error : "Compile failed.")
        return
      }

      let cacheWarning: string | null = null
      try {
        const projectId = window.localStorage.getItem(ACTIVE_PROJECT_KEY)
        if (projectId) {
          const circuit_data = {
            format: "solderhub-simulator-project",
            version: 1,
            board: "arduino-uno",
            components: state.components,
            wires: state.wires,
            code: { language: "cpp", board: "arduino-uno", source: currentSource },
          }
          const cacheResponse = await fetch(PROJECT_ITEM_API, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: projectId,
              circuit_data,
              firmware: { hex: data.hex, target: "arduino-uno", compiler_version: "SolderHub AVR compile service" },
            }),
          })
          if (!cacheResponse.ok) {
            const cacheData = await cacheResponse.json().catch(() => ({}))
            cacheWarning = typeof cacheData.error === "string"
              ? `Compiled and running, but HEX was not cached: ${cacheData.error}`
              : "Compiled and running, but HEX could not be cached to the saved project."
            if (cacheResponse.status === 403 || cacheResponse.status === 404) window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
          }
        }
      } catch { cacheWarning = "Compiled and running, but the saved HEX cache could not be reached." }

      dispatch({ type: "SET_RUNNING", isRunning: true })
      onFirmwareLoaded({ componentId: unoBoard.id, hex: data.hex })
      if (cacheWarning) setError(cacheWarning)
    } catch {
      setError("Couldn't reach the compile service. Check your connection and try again.")
    } finally { setIsCompiling(false) }
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex justify-end">
      <div style={{ width: panelWidth, maxWidth: "92vw" }} className={"pointer-events-auto relative flex h-full w-[min(28rem,92vw)] flex-col overflow-hidden border-l border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-200 " + (isResizing ? "select-none" : "")}>
        <div role="separator" aria-orientation="vertical" aria-label="Resize code editor" aria-valuenow={Math.round(panelWidth)} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); resizeStartRef.current = { x: event.clientX, width: panelWidth }; setIsResizing(true) }} onKeyDown={(event) => { if (event.key === "ArrowLeft") setPanelWidth((width) => Math.min(window.innerWidth * 0.82, width + 24)); if (event.key === "ArrowRight") setPanelWidth((width) => Math.max(320, width - 24)) }} className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/50" />
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">Your sketch</p><p className="truncate text-[10px] text-muted-foreground">{unoBoard ? "Targeting: Arduino Uno on canvas" : "No Arduino Uno on canvas yet"}</p></div>
          <Button size="sm" onClick={() => handleRun(source)} disabled={isCompiling || !AVR_COMPILER_ENABLED} className="gap-1.5" title={AVR_COMPILER_ENABLED ? "Compile & Run (Ctrl/Cmd + Enter)" : "AVR compilation is paused to conserve hosting resources"}>{isCompiling ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}{isCompiling ? "Compiling…" : AVR_COMPILER_ENABLED ? "Compile & Run" : "Compile paused"}</Button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground tap-pad" aria-label="Close code editor"><X className="size-4" /></button>
        </div>
        {!AVR_COMPILER_ENABLED ? <div className="flex items-start gap-2 border-b border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>Online AVR compilation is temporarily paused to keep deployments small and conserve hosting resources. Saved/prebuilt projects remain available.</span></div> : !unoBoard && <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>{esp32Board ? "Custom code only runs on Arduino Uno for now — ESP32 support is coming." : "Drag an Arduino Uno onto the canvas first — that's what this sketch will run on."}</span></div>}
        <div className="min-h-0 flex-1 overflow-auto"><CodeMirror value={source} onChange={(value) => setSource(value)} extensions={[cpp()]} theme={theme === "dark" ? oneDark : undefined} editable={!isCompiling} basicSetup={{ lineNumbers: true, foldGutter: false }} style={{ fontSize: 13, height: "100%" }} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (AVR_COMPILER_ENABLED && !isCompiling) handleRun(source) } }} /></div>
        {error && <div className="max-h-40 overflow-y-auto border-t border-destructive/30 bg-destructive/10 px-3 py-2"><pre className="whitespace-pre-wrap font-mono text-[11px] leading-snug text-destructive">{error}</pre></div>}
      </div>
    </div>
  )
}
