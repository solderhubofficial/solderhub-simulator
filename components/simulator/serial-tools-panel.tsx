"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, Cpu, Radio, Send, Terminal, Trash2, X } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { cn } from "@/lib/utils"

type SerialToolMode = "monitor" | "plotter"

interface SerialToolsPanelProps {
  mode: SerialToolMode
  onClose: () => void
  runtimeAvailable: boolean
}

type NumericSnapshot = Record<string, number>

const TRACE_COLORS = ["#7DBBFF", "#FF8A24", "#45C58A", "#B69CFF", "#F06E91"]

function parseNumericSerialLine(line: string): NumericSnapshot | null {
  const values: NumericSnapshot = {}
  const namedPattern = /([A-Za-z_][\w -]*?)\s*[:=]\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/gi
  let match: RegExpExecArray | null
  while ((match = namedPattern.exec(line)) !== null) {
    const value = Number(match[2])
    if (Number.isFinite(value)) values[match[1].trim()] = value
  }
  if (Object.keys(values).length > 0) return values

  const tokens = line.trim().split(/[\s,;\t]+/).filter(Boolean)
  if (tokens.length === 0) return null
  tokens.forEach((token, index) => {
    const value = Number(token)
    if (Number.isFinite(value)) values[`Series ${index + 1}`] = value
  })
  return Object.keys(values).length > 0 ? values : null
}

export function SerialToolsPanel({ mode, onClose, runtimeAvailable }: SerialToolsPanelProps) {
  const { state } = useSimulator()
  const [terminalText, setTerminalText] = useState("")
  const [serialSamples, setSerialSamples] = useState<NumericSnapshot[]>([])
  const [serialInput, setSerialInput] = useState("")
  const [baudRate, setBaudRate] = useState<number | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const board = state.components.find((component) => component.type === "arduino-uno" || component.type === "esp32-devkit")
  const canSend = runtimeAvailable && state.isRunning && board?.type === "arduino-uno"

  useEffect(() => {
    const receiveChunk = (event: Event) => {
      const character = (event as CustomEvent<string>).detail
      if (typeof character !== "string") return
      setTerminalText((current) => (current + character).slice(-16000))
    }
    const receiveLine = (event: Event) => {
      const line = (event as CustomEvent<string>).detail
      if (typeof line !== "string") return
      const parsed = parseNumericSerialLine(line)
      if (parsed) setSerialSamples((current) => [...current.slice(-47), parsed])
    }
    const receiveConfiguration = (event: Event) => {
      const detail = (event as CustomEvent<{ baudRate?: number | null }>).detail
      setBaudRate(typeof detail?.baudRate === "number" ? detail.baudRate : null)
    }
    window.addEventListener("simulator:serial-chunk", receiveChunk)
    window.addEventListener("simulator:serial-output", receiveLine)
    window.addEventListener("simulator:serial-config", receiveConfiguration)
    return () => {
      window.removeEventListener("simulator:serial-chunk", receiveChunk)
      window.removeEventListener("simulator:serial-output", receiveLine)
      window.removeEventListener("simulator:serial-config", receiveConfiguration)
    }
  }, [])

  useEffect(() => {
    if (mode === "monitor" && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [mode, terminalText])

  const seriesKeys = useMemo(
    () => [...new Set(serialSamples.flatMap((sample) => Object.keys(sample)))].slice(0, TRACE_COLORS.length),
    [serialSamples],
  )

  const sendSerialInput = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend || !serialInput.trim()) return
    window.dispatchEvent(new CustomEvent("simulator:serial-input", { detail: serialInput }))
    setSerialInput("")
  }

  return (
    <aside className="sim-panel absolute inset-y-0 right-0 z-20 flex h-full w-[min(24rem,calc(100vw-3rem))] max-w-80 shrink-0 flex-col border-l border-border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200">
      <header className="flex items-center gap-2 border-b border-border/80 px-3 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {mode === "monitor" ? <Terminal className="size-4" /> : <Activity className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">{mode === "monitor" ? "Serial Monitor" : "Serial Plotter"}</h2>
          <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{mode === "monitor" ? "UART / terminal stream" : "Numeric UART / live trace"}</p>
        </div>
        <button
          type="button"
          title={mode === "monitor" ? "Clear monitor" : "Clear plot"}
          aria-label={mode === "monitor" ? "Clear serial monitor" : "Clear serial plotter"}
          onClick={() => mode === "monitor" ? setTerminalText("") : setSerialSamples([])}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-3.5" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close tool" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </header>

      {mode === "monitor" ? (
        <div className="sim-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-xs font-medium">
              <Cpu className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{board?.name ?? "No supported board detected"}</span>
            </span>
            <span className={cn("rounded px-1.5 py-1 font-mono text-[9px] font-bold", canSend ? "bg-status-running/15 text-status-running" : "bg-muted text-muted-foreground")}>
              {canSend ? "CONNECTED" : "IDLE"}
            </span>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-[#08111f] text-[#d5e5f7]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#7DBBFF]">
              <span>UART / RX-TX</span>
              <span>{baudRate ? `${baudRate.toLocaleString()} baud` : "BAUD —"}</span>
            </div>
            <div ref={terminalRef} className="sim-scrollbar min-h-40 flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
              {terminalText ? (
                <pre className="whitespace-pre-wrap break-words">{terminalText}</pre>
              ) : (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <Radio className="size-6 text-[#7DBBFF]/45" />
                  <p className="mt-3 font-semibold text-[#d5e5f7]">{runtimeAvailable ? "Waiting for serial output" : "UART runtime offline"}</p>
                  <p className="mt-1 max-w-56 text-[9px] leading-relaxed text-[#a4b8cf]">
                    {runtimeAvailable
                      ? "Serial.print() and Serial.println() text from the running Arduino Uno sketch appears here."
                      : "Load a preset sketch or compile an Arduino Uno sketch, then start the simulation to connect the serial bridge."}
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-3 py-2 font-mono text-[9px] text-[#89a2bd]">SIM {state.isRunning ? "ACTIVE" : "HALTED"} · {state.components.length} PARTS · {state.wires.length} WIRES</div>
          </div>

          <form onSubmit={sendSerialInput} className="mt-3 flex gap-2">
            <input
              value={serialInput}
              onChange={(event) => setSerialInput(event.target.value)}
              disabled={!canSend}
              placeholder={canSend ? "Send text to Serial.read()" : "Run an Arduino Uno sketch to send input"}
              aria-label="Serial input"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-[10px] outline-none focus-visible:border-primary disabled:opacity-50"
            />
            <button type="submit" disabled={!canSend || !serialInput.trim()} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 font-mono text-[9px] font-bold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <Send className="size-3" /> Send
            </button>
          </form>
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Incoming text is delivered to the simulated Uno UART as UTF-8 followed by a newline. The sketch must call Serial.begin() and read from Serial.</p>
        </div>
      ) : (
        <div className="sim-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
            <div>
              <p className="text-xs font-semibold">{board?.name ?? "No supported board detected"}</p>
              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{seriesKeys.length} numeric series · {serialSamples.length} samples</p>
            </div>
            <span className={cn("rounded px-1.5 py-1 font-mono text-[9px] font-bold", runtimeAvailable && state.isRunning ? "bg-status-running/15 text-status-running" : "bg-muted text-muted-foreground")}>
              {runtimeAvailable && state.isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 p-2">
            <svg viewBox="0 0 300 88" role="img" aria-label="Numeric serial output plot" className="h-36 w-full">
              {[16, 43, 70].map((y) => <line key={y} x1="8" y1={y} x2="292" y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 4" />)}
              {seriesKeys.map((key, seriesIndex) => {
                const seriesValues = serialSamples.map((sample) => sample[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value))
                if (seriesValues.length === 0) return null
                const minValue = Math.min(...seriesValues)
                const maxValue = Math.max(...seriesValues)
                let started = false
                const path = serialSamples.map((sample, sampleIndex) => {
                  const value = sample[key]
                  if (typeof value !== "number" || !Number.isFinite(value)) return ""
                  const x = 8 + (sampleIndex / Math.max(1, serialSamples.length - 1)) * 284
                  const y = maxValue === minValue ? 43 : 70 - ((value - minValue) / (maxValue - minValue)) * 54
                  const command = started ? "L" : "M"
                  started = true
                  return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`
                }).filter(Boolean).join(" ")
                return <path key={key} d={path} fill="none" stroke={TRACE_COLORS[seriesIndex]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              })}
            </svg>
            {seriesKeys.length > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pb-1">
                {seriesKeys.map((key, index) => <span key={key} className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: TRACE_COLORS[index] }} />{key}</span>)}
              </div>
            ) : (
              <div className="px-2 pb-3 text-center">
                <Activity className="mx-auto size-6 text-muted-foreground/45" />
                <p className="mt-2 text-xs font-medium">No numeric serial data</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Print numbers using Serial.println(), or label multiple values such as temperature:24,humidity:52. CSV and label:value rows are plotted as separate traces.</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">The plotter parses numeric Serial output from the running AVR/Uno sketch. Text-only lines remain visible in the monitor but are ignored here.</p>
        </div>
      )}
    </aside>
  )
}
