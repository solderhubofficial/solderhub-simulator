"use client"

import { useEffect, useRef, useState } from "react"
import { Activity, Cpu, Radio, Terminal, Trash2, X } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { cn } from "@/lib/utils"

type SerialToolMode = "monitor" | "plotter"

interface SerialToolsPanelProps {
  mode: SerialToolMode
  onClose: () => void
}

type PinSnapshot = Record<string, number>

const TRACE_COLORS = ["#7DBBFF", "#FF8A24", "#45C58A", "#B69CFF", "#F06E91"]

export function SerialToolsPanel({ mode, onClose }: SerialToolsPanelProps) {
  const { state } = useSimulator()
  const [serialLines, setSerialLines] = useState<string[]>([])
  const [samples, setSamples] = useState<PinSnapshot[]>([])
  const board = state.components.find((component) => component.type === "arduino-uno" || component.type === "esp32-devkit")
  const pinValues = board
    ? ((board.metadata.pinValues ?? {}) as Record<string, number>)
    : {}
  const signalValuesRef = useRef<PinSnapshot>({})
  signalValuesRef.current = Object.fromEntries(
    Object.entries(pinValues).filter(
      ([name, value]) => /^(D\d+|A\d+|GPIO\d+)$/.test(name) && typeof value === "number" && Number.isFinite(value),
    ),
  )

  useEffect(() => {
    const receiveSerialOutput = (event: Event) => {
      const detail = (event as CustomEvent<string | { text?: string }>).detail
      const line = typeof detail === "string" ? detail : detail?.text
      if (typeof line !== "string" || line.length === 0) return
      setSerialLines((current) => [...current.slice(-499), line])
    }
    window.addEventListener("simulator:serial-output", receiveSerialOutput)
    return () => window.removeEventListener("simulator:serial-output", receiveSerialOutput)
  }, [])

  useEffect(() => {
    if (mode !== "plotter" || !state.isRunning || !board) return
    const intervalId = window.setInterval(() => {
      const snapshot = { ...signalValuesRef.current }
      if (Object.keys(snapshot).length === 0) return
      setSamples((current) => [...current.slice(-47), snapshot])
    }, 180)
    return () => window.clearInterval(intervalId)
  }, [mode, state.isRunning, board?.id])

  const signalKeys = [...new Set(samples.flatMap((sample) => Object.keys(sample)))].slice(0, TRACE_COLORS.length)

  return (
    <aside className="sim-panel absolute inset-y-0 right-0 z-20 flex h-full w-[min(24rem,calc(100vw-3rem))] max-w-80 shrink-0 flex-col border-l border-border shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200">
      <header className="flex items-center gap-2 border-b border-border/80 px-3 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          {mode === "monitor" ? <Terminal className="size-4" /> : <Activity className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">{mode === "monitor" ? "Serial Monitor" : "Serial Plotter"}</h2>
          <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">{mode === "monitor" ? "UART / terminal stream" : "GPIO / live trace"}</p>
        </div>
        {mode === "monitor" ? (
          <button type="button" title="Clear monitor" aria-label="Clear serial monitor" onClick={() => setSerialLines([])} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <button type="button" title="Clear plot" aria-label="Clear serial plotter" onClick={() => setSamples([])} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <Trash2 className="size-3.5" />
          </button>
        )}
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
            <span className={cn("rounded px-1.5 py-1 font-mono text-[9px] font-bold", state.isRunning ? "bg-status-running/15 text-status-running" : "bg-muted text-muted-foreground")}>
              {state.isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-[#08111f] text-[#d5e5f7]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-[#7DBBFF]">
              <span>UART / RX-TX</span><span>{serialLines.length} lines</span>
            </div>
            <div className="sim-scrollbar min-h-40 flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
              {serialLines.length ? serialLines.map((line, index) => <p key={`${index}-${line.slice(0, 20)}`} className="whitespace-pre-wrap break-words">{line}</p>) : (
                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                  <Radio className="size-6 text-[#7DBBFF]/45" />
                  <p className="mt-3 font-semibold text-[#d5e5f7]">Waiting for UART data</p>
                  <p className="mt-1 max-w-56 text-[9px] leading-relaxed text-[#a4b8cf]">No serial bytes captured yet. The current AVR runtime exposes digital GPIO only; this panel listens for serial output events and will not fabricate terminal text.</p>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-3 py-2 font-mono text-[9px] text-[#89a2bd]">SIM {state.isRunning ? "ACTIVE" : "HALTED"} · {state.components.length} PARTS · {state.wires.length} WIRES</div>
          </div>
        </div>
      ) : (
        <div className="sim-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2">
            <div>
              <p className="text-xs font-semibold">{board?.name ?? "No supported board detected"}</p>
              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{signalKeys.length} digital signals · {samples.length} samples</p>
            </div>
            <span className={cn("rounded px-1.5 py-1 font-mono text-[9px] font-bold", state.isRunning ? "bg-status-running/15 text-status-running" : "bg-muted text-muted-foreground")}>
              {state.isRunning ? "LIVE" : "PAUSED"}
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 p-2">
            <svg viewBox="0 0 300 88" role="img" aria-label="Digital GPIO trace plot" className="h-36 w-full">
              {[16, 43, 70].map((y) => <line key={y} x1="8" y1={y} x2="292" y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 4" />)}
              {samples.length > 1 && signalKeys.map((key, seriesIndex) => {
                const path = samples.map((sample, sampleIndex) => {
                  const x = 8 + (sampleIndex / Math.max(1, samples.length - 1)) * 284
                  const y = (sample[key] ?? 0) >= 0.5 ? 16 : 70
                  return `${sampleIndex === 0 ? "M" : "L"} ${x.toFixed(1)} ${y}`
                }).join(" ")
                return <path key={key} d={path} fill="none" stroke={TRACE_COLORS[seriesIndex]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              })}
            </svg>
            {signalKeys.length > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pb-1">
                {signalKeys.map((key, index) => <span key={key} className="flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: TRACE_COLORS[index] }} />{key}</span>)}
              </div>
            ) : (
              <div className="px-2 pb-3 text-center">
                <Activity className="mx-auto size-6 text-muted-foreground/45" />
                <p className="mt-2 text-xs font-medium">No GPIO trace available</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Load or compile a supported sketch, start the simulation, and digital pin changes will be plotted here.</p>
              </div>
            )}
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">The plotter samples live digital pin values published by the simulated board runtime. Values stay flat when firmware is stopped or does not change those pins.</p>
        </div>
      )}
    </aside>
  )
}
