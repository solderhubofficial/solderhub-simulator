"use client"

import { SOLDERHUB_PROJECT_ITEM_API } from "@/lib/simulator/solderhub-api"
import { useCallback, useEffect, useRef, useState } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { cpp } from "@codemirror/lang-cpp"
import { oneDark } from "@codemirror/theme-one-dark"
import { X, Loader2, AlertTriangle, Check, ArrowRight, Terminal, ListTree, Trash2, ChevronDown, Play, Square, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { useTheme } from "@/hooks/use-theme"
import type { SerialLog } from "@/hooks/simulator/use-serial-log"
import { SerialMonitorView } from "@/components/simulator/serial-monitor-view"
import { buildUploadScript, classifyCompilerLine, hexByteCount, type LogLevel, type LogLine } from "@/lib/simulator/avr/build-log"
import type { ActiveFirmware } from "@/components/simulator/firmware-runner"
import type { ActiveEsp32Firmware } from "@/components/simulator/esp32-firmware-runner"
import { findPreviewBoard } from "@/lib/simulator/board-support"
import { compileEsp32Sketch, formatDiagnostic } from "@/lib/simulator/esp32/compile-client"
import { describeRuntimeStatus, type Esp32RuntimeStatus } from "@/lib/simulator/esp32/runtime-protocol"
import { ESP32_BLINK_SKETCH } from "@/lib/simulator/esp32/sketches"
import { getEsp32Target, isEsp32BoardType } from "@/lib/simulator/esp32/targets"

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
  /** Latest successful ESP32 build (the emulator runs this when the simulation runs). */
  esp32Firmware: ActiveEsp32Firmware | null
  /** What the emulator is actually doing right now. */
  esp32Status: Esp32RuntimeStatus
  onEsp32Compiled: (firmware: Omit<ActiveEsp32Firmware, "runId">) => void
  /** Boot the latest build again from power-on. */
  onEsp32Reset: () => void
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-foreground",
  command: "font-semibold text-primary",
  success: "text-status-running",
  warning: "text-status-idle",
  error: "text-status-error",
  dim: "text-muted-foreground",
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

type Phase = "idle" | "compiling" | "uploading"

export function CodeEditorPanel({ open, onInsetChange, onClose, onFirmwareLoaded, serial, runtimeAvailable, tab, onTabChange, esp32Firmware, esp32Status, onEsp32Compiled, onEsp32Reset }: CodeEditorPanelProps) {
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
  const compileAbortRef = useRef<AbortController | null>(null)
  const [targetPref, setTargetPref] = useState<"avr" | "esp32">("avr")
  const busy = phase !== "idle"

  const unoBoard = state.components.find((c) => c.type === "arduino-uno")
  const esp32Board = state.components.find((c) => isEsp32BoardType(c.type))
  const target: "avr" | "esp32" | "none" = unoBoard && esp32Board ? targetPref : esp32Board ? "esp32" : unoBoard ? "avr" : "none"
  const previewBoard = target === "none" ? findPreviewBoard(state.components) : null
  const esp32Target = esp32Board ? getEsp32Target(esp32Board.type) : null

  // On a phone-width screen the editor covers the whole workspace (a sheet), so it must not also shrink the
  // canvas by its desktop width -- that left a negative-width canvas and a panel sliding under the tool rail.
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)")
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    onInsetChange(open && !narrow ? panelWidth : 0)
    return () => onInsetChange(0)
  }, [open, narrow, panelWidth, onInsetChange])

  useEffect(() => {
    if (!resizing) return
    const move = (event: PointerEvent) => {
      const start = resizeStartRef.current
      if (!start) return
      if (resizing === "width") setPanelWidth(Math.max(320, Math.min(window.innerWidth * 0.82, start.width + event.clientX - start.x)))
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

  // The AVR starter sketch is replaced by the ESP32 Blink only while it is still untouched.
  useEffect(() => {
    if (target === "esp32") setSource((current) => (current === DEFAULT_SKETCH ? ESP32_BLINK_SKETCH : current))
    if (target === "avr") setSource((current) => (current === ESP32_BLINK_SKETCH ? DEFAULT_SKETCH : current))
  }, [target])

  // Cancel an in-flight compile when the panel unmounts.
  useEffect(() => () => compileAbortRef.current?.abort(), [])

  // Surface what the emulator really does: boot, errors and stops go to the Output console.
  const lastRuntimeStateRef = useRef<Esp32RuntimeStatus["state"]>("idle")
  useEffect(() => {
    const previous = lastRuntimeStateRef.current
    lastRuntimeStateRef.current = esp32Status.state
    if (previous === esp32Status.state) return
    if (esp32Status.state === "error") push("error", describeRuntimeStatus(esp32Status))
    else if (esp32Status.state === "running") push("success", "Firmware is running in the emulator.")
    else if (esp32Status.state === "stopped" && previous !== "idle") push("info", "Firmware stopped.")
  }, [esp32Status, push])

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

  const live = runtimeAvailable && state.isRunning
  const canSend = live && target === "avr" && Boolean(unoBoard)
  const esp32Fresh = Boolean(esp32Firmware) && esp32Firmware?.source === source && esp32Firmware?.componentId === esp32Board?.id && esp32Firmware?.boardType === esp32Board?.type
  const esp32Running = state.isRunning && esp32Fresh && (esp32Status.state === "starting" || esp32Status.state === "booting" || esp32Status.state === "running")
  const esp32RunBlockedReason = !esp32Board ? "Place an ESP32 board on the canvas." : !esp32Firmware ? "Compile the sketch first." : !esp32Fresh ? "The sketch or board changed since the last compile. Compile again." : null

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
        ? "ESP32 firmware is not connected to this canvas yet. Open ESP32 Lab to run supported firmware separately; sketch compilation and canvas GPIO bridging are not available there yet."
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

  /** Compile for the ESP32 board on the canvas. Publishes the firmware only when the real build succeeded. */
  const compileForEsp32 = async (currentSource: string): Promise<boolean> => {
    if (!esp32Board || !esp32Target) return false
    compileAbortRef.current?.abort()
    const controller = new AbortController()
    compileAbortRef.current = controller
    setPhase("compiling")
    onTabChange("output")
    setConsoleOpen(true)
    setOutput([])
    push("command", `Compiling sketch for ${esp32Target.label} (${esp32Target.fqbn})…`)
    const outcome = await compileEsp32Sketch({ source: currentSource, board: esp32Board.type as never }, { signal: controller.signal })
    if (compileAbortRef.current !== controller) return false // superseded by a newer compile
    compileAbortRef.current = null
    if (!outcome.ok) {
      if (outcome.kind === "cancelled") push("warning", outcome.error)
      else {
        for (const d of outcome.diagnostics) pushCompilerText(formatDiagnostic(d))
        if (outcome.diagnostics.length === 0 && outcome.log) pushCompilerText(outcome.log)
        push("error", outcome.kind === "compile_error" ? `Error compiling for board ${esp32Target.label}.` : outcome.error)
      }
      return false
    }
    const { firmware } = outcome
    if (firmware.log) pushCompilerText(firmware.log)
    push("success", `Done compiling. Application image is ${firmware.artifacts.app.length} bytes${firmware.toolchain ? ` (${firmware.toolchain})` : ""}.`)
    onEsp32Compiled({ componentId: esp32Board.id, boardType: firmware.board, chip: firmware.chip, artifacts: firmware.artifacts, source: currentSource })
    return true
  }

  const handleEsp32Compile = async () => {
    if (busy) return
    await compileForEsp32(source)
    setPhase("idle")
  }

  const handleEsp32Run = () => {
    if (esp32RunBlockedReason) return
    serial.clear()
    dispatch({ type: "SET_RUNNING", isRunning: true })
    onTabChange("serial")
  }

  const handleEsp32Stop = () => dispatch({ type: "SET_RUNNING", isRunning: false })

  const handleEsp32Reset = () => {
    if (!esp32Fresh && !esp32Firmware) return
    serial.clear()
    onEsp32Reset()
  }

  const handleEsp32CompileAndRun = async () => {
    if (busy) return
    const ok = await compileForEsp32(source)
    setPhase("idle")
    if (!ok) return
    serial.clear()
    dispatch({ type: "SET_RUNNING", isRunning: true })
    onTabChange("serial")
  }

  const statusText = phase === "compiling" ? "Compiling…" : phase === "uploading" ? "Uploading…" : null
  const hasErrors = output.some((l) => l.level === "error")

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-30 flex justify-start max-md:right-0">
      <div style={{ width: narrow ? "100%" : panelWidth, maxWidth: "100%" }} className={cn("pointer-events-auto relative flex h-full flex-col overflow-hidden border-r border-border bg-card shadow-xl animate-in slide-in-from-left-4 duration-200", resizing && "select-none")}>
        <div role="separator" aria-orientation="vertical" aria-label="Resize code editor" aria-valuenow={Math.round(panelWidth)} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); resizeStartRef.current = { x: event.clientX, y: event.clientY, width: panelWidth, height: consoleHeight }; setResizing("width") }} onKeyDown={(event) => { if (event.key === "ArrowRight") setPanelWidth((w) => Math.min(window.innerWidth * 0.82, w + 24)); if (event.key === "ArrowLeft") setPanelWidth((w) => Math.max(320, w - 24)) }} className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-primary/40 focus-visible:bg-primary/50" />

        {/* Toolbar: Verify / Upload like the IDE (AVR) or Compile / Run / Reset (ESP32) */}
        <div className="flex min-h-11 items-center gap-2 border-b border-border bg-card px-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <p className="shrink-0 self-stretch border-b-2 border-primary px-1 pt-3 font-mono text-[13px] text-foreground">sketch.ino</p>
            <p className="hidden min-w-0 truncate text-[11px] text-muted-foreground xl:block" data-testid="editor-target">
              {target === "esp32" && esp32Target ? `Board: ${esp32Target.label} on canvas${esp32Target.status === "experimental" ? " · experimental" : ""}` : target === "avr" ? "Board: Arduino Uno on canvas" : previewBoard ? `Board: ${previewBoard.label} · design preview only` : "No supported board on canvas yet"}
            </p>
          </div>
          {unoBoard && esp32Board && (
            <select aria-label="Compile target" value={targetPref} onChange={(event) => setTargetPref(event.target.value === "esp32" ? "esp32" : "avr")} className="h-8 rounded-md border border-border bg-background px-1.5 text-xs text-foreground">
              <option value="avr">Arduino Uno</option>
              <option value="esp32">{esp32Target?.label ?? "ESP32"}</option>
            </select>
          )}
          {target === "esp32" ? (
            <>
              <Button size="sm" variant="outline" onClick={handleEsp32Compile} disabled={busy || !esp32Target} className="gap-1.5" title="Compile with the ESP32 Arduino core" data-testid="esp32-compile">
                {phase === "compiling" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Compile
              </Button>
              {esp32Running || (state.isRunning && esp32Fresh) ? (
                <Button size="sm" variant="outline" onClick={handleEsp32Stop} className="gap-1.5" title="Stop the simulation" data-testid="esp32-stop"><Square className="size-3.5" />Stop</Button>
              ) : (
                <Button size="sm" onClick={handleEsp32Run} disabled={busy || esp32RunBlockedReason !== null} className="gap-1.5" title={esp32RunBlockedReason ?? "Run the compiled firmware (Ctrl/Cmd + Enter compiles and runs)"} data-testid="esp32-run"><Play className="size-3.5" />Run</Button>
              )}
              <Button size="sm" variant="outline" onClick={handleEsp32Reset} disabled={busy || !esp32Firmware} className="gap-1.5" title="Reboot the latest build from power-on" data-testid="esp32-reset"><RotateCcw className="size-3.5" />Reset</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleVerify} disabled={busy || !AVR_COMPILER_ENABLED} className="gap-1.5" title="Verify — compile only">
                {phase === "compiling" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Verify
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={busy || !AVR_COMPILER_ENABLED} className="gap-1.5" title={AVR_COMPILER_ENABLED ? "Upload — compile, flash and run (Ctrl/Cmd + Enter)" : "AVR compilation is paused to conserve hosting resources"}>
                {phase === "uploading" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}{phase === "uploading" ? "Uploading…" : AVR_COMPILER_ENABLED ? "Upload" : "Compile paused"}
              </Button>
            </>
          )}
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground tap-pad" aria-label="Close code editor"><X className="size-4" /></button>
        </div>
        {target === "esp32" ? (
          <div className={cn("flex items-start gap-2 border-b border-border px-3 py-2 text-xs", esp32Status.state === "error" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted/70 text-muted-foreground")} role="status" data-testid="esp32-status" data-esp32-runtime={esp32Status.state} data-esp32-build={esp32Firmware ? (esp32Fresh ? "fresh" : "stale") : "none"}>
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {esp32Firmware ? (esp32Fresh ? "Built · up to date." : "Source changed since the last build.") : "Not built yet — press Compile (Ctrl/Cmd + Enter builds and runs)."}{" "}
              {describeRuntimeStatus(esp32Status)}
              {esp32Target && esp32Target.status !== "supported" ? ` ${esp32Target.statusNote}` : ""}
            </span>
          </div>
        ) : target === "avr" && !AVR_COMPILER_ENABLED ? <div className="flex items-start gap-2 border-b border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>Online AVR compilation is temporarily paused to keep deployments small and conserve hosting resources. Saved/prebuilt projects remain available.</span></div> : target === "none" && <div className="flex items-start gap-2 border-b border-border bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>{previewBoard ? `${previewBoard.label} ${previewBoard.note}` : "Drag an Arduino Uno or a supported ESP32 board onto the canvas first — that's what this sketch will run on."}</span></div>}

        {/* Editor */}
        <div className="min-h-0 flex-1 overflow-auto">
          <CodeMirror
            value={source}
            onChange={(value) => setSource(value)}
            onCreateEditor={(view) => { viewRef.current = view }}
            extensions={[cpp(), EditorView.theme({ "&": { backgroundColor: "transparent" }, ".cm-gutters": { backgroundColor: "transparent", border: "none" }, ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--muted) 70%, transparent)" }, ".cm-activeLineGutter": { backgroundColor: "transparent" } })]}
            theme={theme === "dark" ? oneDark : undefined}
            editable={!busy}
            basicSetup={{ lineNumbers: true, foldGutter: false }}
            style={{ fontSize: 14, height: "100%" }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); if (busy) return; if (target === "esp32") void handleEsp32CompileAndRun(); else if (AVR_COMPILER_ENABLED) void handleUpload() } }}
          />
        </div>

        {/* Console (same width as the editor) */}
        {consoleOpen && (
          <div role="separator" aria-orientation="horizontal" aria-label="Resize console" onPointerDown={(event) => { event.preventDefault(); resizeStartRef.current = { x: event.clientX, y: event.clientY, width: panelWidth, height: consoleHeight }; setResizing("height") }} className="h-1.5 shrink-0 cursor-row-resize touch-none border-t border-border bg-transparent transition-colors hover:bg-primary/40" />
        )}
        <div className="flex h-11 shrink-0 items-center gap-1 border-y border-border bg-card px-2">
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
              <div ref={outputRef} className="sim-scrollbar h-full overflow-y-auto bg-background px-3 py-2 font-mono text-xs text-foreground/90 leading-[1.55]" role="log" aria-live="polite">
                {output.length === 0 ? (
                  <p className="text-[#7f93ab]">{target === "esp32" ? "Compile builds the sketch with the ESP32 Arduino core; Run starts the compiled firmware in the browser emulator. Compiler output and emulator status appear here." : "Verify compiles the sketch; Upload compiles, flashes the simulated Uno and starts it. Compiler and upload details appear here."}</p>
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
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors", active ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
      <Icon className="size-3.5" />{label}{dot && <span className={cn("size-1.5 rounded-full", dot)} />}
    </button>
  )
}
