"use client"

import { SOLDERHUB_PROJECT_ITEM_API } from "@/lib/simulator/solderhub-api"
import { useCallback, useEffect, useRef, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import type { EditorView } from "@codemirror/view"
import { cpp } from "@codemirror/lang-cpp"
import { oneDark } from "@codemirror/theme-one-dark"
import { X, Loader2, AlertTriangle, Check, ArrowRight, Terminal, ListTree, Trash2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import type { SerialLog } from "@/hooks/simulator/use-serial-log"
import { SerialMonitorView } from "@/components/simulator/serial-monitor-view"
import { buildUploadScript, classifyCompilerLine, hexByteCount, type LogLevel, type LogLine } from "@/lib/simulator/avr/build-log"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"

const DEFAULT_SKETCH = `void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED on");
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED off");
  delay(500);
}
`

const STORAGE_KEY = "solderhub-simulator:sketch-draft"
const ACTIVE_PROJECT_KEY = "solderhub-simulator:active-project-id"
const PROJECT_ITEM_API = SOLDERHUB_PROJECT_ITEM_API
const AVR_COMPILER_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AVR_COMPILER === "1"
const MAX_OUTPUT_LINES = 400

export type ConsoleTab = "output" | "serial"

interface CodeEditorPanelProps {
  open: boolean
  onInsetChange: (inset: number) => void
  onClose: () => void
  onFirmwareLoaded: (firmware: ActiveFirmware) => void
  serial: SerialLog
  /** A firmware image is loaded, so serial output can appear. */
  runtimeAvailable: boolean
  tab: ConsoleTab
  onTabChange: (tab: ConsoleTab) => void
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-[#d5e5f7]",
  command: "font-semibold text-[#4DA3FF]",
  success: "text-[#3DD68C]",
  warning: "text-[#F2C94C]",
  error: "text-[#FF6B6B]",
  dim: "text-[#7f93ab]",
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

type Phase = "idle" | "compiling" | "uploading"

export function CodeEditorPanel({ open, onInsetChange, onClose, onFirmwareLoaded, serial, runtimeAvailable, tab, onTabChange }: CodeEditorPanelProps) {
  const { state, dispatch } = useSimulator()
  const { theme } = useTheme()
  const [source, setSource] = useState(DEFAULT_SKETCH)
  const [phase, setPhase] = useState<Phase>("idle")
  const [output, setOutput] = useState<LogLine[]>([])
  const [panelWidth, setPanelWidth] = useState(560)
  const [consoleHeight, setConsoleHeight] = useState(280)
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [resizing, setResizing] = useState<"width" | "height" | null>(null)
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const lineIdRef = useRef(0)
  const uploadCounterRef = useRef(0)
  const busy = phase !== "idle"

  useEffect(() => {
    onInsetChange(open ? panelWidth : 0)
    return () => onInsetChange(0)
  }, [open, panelWidth, onInsetChange])

  useEffect(() => {
    if (!resizing) return
    const move = (event: PointerEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      if (resizing === "width") setPanelWidth(Math.max(320, Math.min(window.innerWidth * 0.82, start.width + start.x - event.clientX)))
      else setConsoleHeight(Math.max(120, Math.min(window.innerHeight * 0.7, start.height + start.y - event.clientY)))
    }
    const up = () => { resizeStartRef.current = null; setResizing(null) }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up) }
  }, [resizing])

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

  useEffect(() => {
    if (tab === "output" && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output, tab, consoleOpen])

  const push = useCallback((level: LogLevel, text: string, sourceLine?: number) => {
    setOutput((existing) => [...existing, { id: lineIdRef.current++, level, text, sourceLine }].slice(-MAX_OUTPUT_LINES))
  }, [])

  const pushCompilerText = useCallback((text: string) => {
    for (const raw of text.split(/\r?\n/)) {
      if (!raw.trim()) continue
      const { level, sourceLine } = classifyCompilerLine(raw)
      push(level, raw, sourceLine)
    }
  }, [push])

  const jumpToLine = (line: number) => {
    const view = viewRef.current
    if (!view) return
    const n = Math.min(Math.max(1, line), view.state.doc.lines)
    view.dispatch({ selection: { anchor: view.state.doc.line(n).from }, scrollIntoView: true })
    view.focus()
  }

  if (!open) return null

  const unoBoard = state.components.find((c) => c.type === "arduino-uno")
  const esp32Board = state.components.find((c) => c.type === "esp32-devkit")
  const live = runtimeAvailable && state.isRunning
  const canSend = live && Boolean(unoBoard)

  /** Runs the compile service and prints its report. Returns the hex on success. */
  const compile = async (currentSource: string): Promise<string | null> => {
    setPhase("compiling")
    onTabChange("output")
    setConsoleOpen(true)
    setOutput([])
    push("command", "Compiling sketch for Arduino Uno (arduino:avr:uno)…")
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: currentSource }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || typeof data.hex !== "string") {
        const message = typeof data.error === "string" ? data.error : "Compile failed."
        pushCompilerText(message)
        push("error", "Error compiling for board Arduino Uno.")
        return null
      }
      if (typeof data.log === "string") pushCompilerText(data.log)
      push("success", `Done compiling. Binary is ${hexByteCount(data.hex)} bytes.`)
      return data.hex
    } catch {
      push("error", "Couldn't reach the compile service. Check your connection and try again.")
      return null
    }
  }

  const handleVerify = async () => {
    if (busy) return
    await compile(source)
    setPhase("idle")
  }

  const handleUpload = async () => {
    if (busy) return
    if (!unoBoard) {
      onTabChange("output")
      setConsoleOpen(true)
      setOutput([])
      push("error", esp32Board
        ? "Custom code currently only runs on Arduino Uno — ESP32 support is coming soon. Add a Uno to the canvas to try this out."
        : "Place an Arduino Uno on the canvas before uploading your code.")
      return
    }

    const hex = await compile(source)
    if (!hex) { setPhase("idle"); return }

    setPhase("uploading")
    for (const step of buildUploadScript(hexByteCount(hex))) {
      await sleep(step.delay)
      push(step.level, step.text)
    }

    // Optionally cache the HEX on the saved project (unchanged behaviour).
    try {
      const projectId = window.localStorage.getItem(ACTIVE_PROJECT_KEY)
      if (projectId) {
        const circuit_data = {
          format: "solderhub-simulator-project",
          version: 1,
          board: "arduino-uno",
          components: state.components,
          wires: state.wires,
          code: { language: "cpp", board: "arduino-uno", source },
        }
        const cacheResponse = await fetch(PROJECT_ITEM_API, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: projectId, circuit_data, firmware: { hex, target: "arduino-uno", compiler_version: "SolderHub AVR compile service" } }),
        })
        if (!cacheResponse.ok) {
          const cacheData = await cacheResponse.json().catch(() => ({}))
          push("warning", typeof cacheData.error === "string" ? `HEX was not cached to the saved project: ${cacheData.error}` : "HEX could not be cached to the saved project.")
          if (cacheResponse.status === 403 || cacheResponse.status === 404) window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
        }
      }
    } catch { push("warning", "The saved-project HEX cache could not be reached.") }

    serial.clear()
    uploadCounterRef.current += 1
    dispatch({ type: "SET_RUNNING", isRunning: true })
    onFirmwareLoaded({ componentId: unoBoard.id, hex, uploadId: uploadCounterRef.current })
    setPhase("idle")
    onTabChange("serial")
  }

  const statusText = phase === "compiling" ? "Compiling…" : phase === "uploading" ? "Uploading…" : null
  const hasErrors = output.some((l) => l.level === "error")

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex justify-end">
      <div style={{ width: panelWidth, maxWidth: "92vw" }} className={cn("pointer-events-auto relative flex h-full flex-col overflow-hidden border-l border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-200", resizing && "select-none")}>
        <div role="separator" aria-orientation="vertical" aria-label="Resize code editor" aria-valuenow={Math.round(panelWidth)} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); resizeStartRef.current = { x: event.clientX, y: event.clientY, width: panelWidth, height: consoleHeight }; setResizing("width") }} onKeyDown={(event) => { if (event.key === "ArrowLeft") setPanelWidth((w) => Math.min(window.innerWidth * 0.82, w + 24)); if (event.key === "ArrowRight") setPanelWidth((w) => Math.max(320, w - 24)) }} className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/50" />

        {/* Toolbar: Verify / Upload like the IDE */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">sketch.ino</p><p className="truncate text-[10px] text-muted-foreground">{unoBoard ? "Board: Arduino Uno on canvas" : "No Arduino Uno on canvas yet"}</p></div>
          <Button size="sm" variant="outline" onClick={handleVerify} disabled={busy || !AVR_COMPILER_ENABLED} className="gap-1.5" title="Verify — compile only">
            {phase === "compiling" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Verify
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={busy || !AVR_COMPILER_ENABLED} className="gap-1.5" title={AVR_COMPILER_ENABLED ? "Upload — compile, flash and run (Ctrl/Cmd + Enter)" : "AVR compilation is paused to conserve hosting resources"}>
            {phase === "uploading" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}{phase === "uploading" ? "Uploading…" : AVR_COMPILER_ENABLED ? "Upload" : "Compile paused"}
          </Button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground tap-pad" aria-label="Close code editor"><X className="size-4" /></button>
        </div>
        {!AVR_COMPILER_ENABLED ? <div className="flex items-start gap-2 border-b border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>Online AVR compilation is temporarily paused to keep deployments small and conserve hosting resources. Saved/prebuilt projects remain available.</span></div> : !unoBoard && <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>{esp32Board ? "Custom code only runs on Arduino Uno for now — ESP32 support is coming." : "Drag an Arduino Uno onto the canvas first — that's what this sketch will run on."}</span></div>}

        {/* Editor */}
        <div className="min-h-0 flex-1 overflow-auto">
          <CodeMirror
            value={source}
            onChange={(value) => setSource(value)}
            onCreateEditor={(view) => { viewRef.current = view }}
            extensions={[cpp()]}
            theme={theme === "dark" ? oneDark : undefined}
            editable={!busy}
            basicSetup={{ lineNumbers: true, foldGutter: false }}
            style={{ fontSize: 13, height: "100%" }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (AVR_COMPILER_ENABLED && !busy) void handleUpload() } }}
          />
        </div>

        {/* Console (same width as the editor) */}
        {consoleOpen && (
          <div role="separator" aria-orientation="horizontal" aria-label="Resize console" onPointerDown={(event) => { event.preventDefault(); resizeStartRef.current = { x: event.clientX, y: event.clientY, width: panelWidth, height: consoleHeight }; setResizing("height") }} className="h-1.5 shrink-0 cursor-row-resize touch-none border-t border-border bg-transparent transition-colors hover:bg-primary/40" />
        )}
        <div className="flex shrink-0 items-center border-y border-border bg-muted/40">
          <ConsoleTabButton active={tab === "output"} onClick={() => { onTabChange("output"); setConsoleOpen(true) }} icon={ListTree} label="Output" dot={hasErrors ? "bg-[#FF6B6B]" : undefined} />
          <ConsoleTabButton active={tab === "serial"} onClick={() => { onTabChange("serial"); setConsoleOpen(true) }} icon={Terminal} label="Serial Monitor" dot={live ? "animate-pulse bg-status-running" : undefined} />
          <div className="ml-auto flex items-center gap-1 pr-2">
            {statusText && <span className="mr-1 font-mono text-[10px] text-primary">{statusText}</span>}
            {tab === "output" && <button type="button" title="Clear output" aria-label="Clear output" onClick={() => setOutput([])} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="size-3.5" /></button>}
            <button type="button" title={consoleOpen ? "Collapse console" : "Expand console"} aria-label={consoleOpen ? "Collapse console" : "Expand console"} onClick={() => setConsoleOpen((v) => !v)} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronDown className={cn("size-4 transition-transform", !consoleOpen && "rotate-180")} /></button>
          </div>
        </div>
        {consoleOpen && (
          <div style={{ height: consoleHeight }} className="min-h-0 shrink-0">
            {tab === "output" ? (
              <div ref={outputRef} className="sim-scrollbar h-full overflow-y-auto bg-[#0a1220] px-3 py-2 font-mono text-[11px] leading-[1.55]" role="log" aria-live="polite">
                {output.length === 0 ? (
                  <p className="text-[#7f93ab]">Verify compiles the sketch; Upload compiles, flashes the simulated Uno and starts it. Compiler and upload details appear here.</p>
                ) : output.map((line) => (
                  <div
                    key={line.id}
                    onClick={line.sourceLine ? () => jumpToLine(line.sourceLine!) : undefined}
                    title={line.sourceLine ? `Go to line ${line.sourceLine}` : undefined}
                    className={cn("whitespace-pre-wrap break-words", LEVEL_CLASS[line.level], line.sourceLine && "cursor-pointer hover:underline")}
                  >{line.text}</div>
                ))}
                {busy && <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-[#4DA3FF]" />}
              </div>
            ) : (
              <SerialMonitorView serial={serial} runtimeAvailable={runtimeAvailable} canSend={canSend} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ConsoleTabButton({ active, onClick, icon: Icon, label, dot }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; dot?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-medium transition-colors", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
      <Icon className="size-3.5" />{label}{dot && <span className={cn("size-1.5 rounded-full", dot)} />}
    </button>
  )
}
