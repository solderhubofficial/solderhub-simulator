"use client"

import { ExternalLink, Cpu, ShieldAlert } from "lucide-react"

const EMULATOR_URL = "https://mikroverk.github.io/esp32sim/run.html?wasm&plain"

export default function Esp32LabPage() {
  return (
    <main className="flex h-[100dvh] min-h-0 flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
            <Cpu className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">ESP32 Firmware Lab</h1>
            <p className="text-xs text-muted-foreground">Experimental browser-based firmware emulation</p>
          </div>
        </div>
        <a href="/" className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
          Back to circuit simulator
        </a>
      </header>

      <div className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:px-6">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="max-w-5xl text-muted-foreground">
          This is a first integration step: the emulator runs in the embedded workspace, but it is not yet electrically
          connected to SolderHub canvas wires or virtual components. Load firmware using the emulator's own firmware
          controls. Sketch compilation from this page is not provided yet.
        </p>
      </div>

      <section className="min-h-0 flex-1 p-2 sm:p-4">
        <iframe
          title="ESP32 browser firmware emulator"
          src={EMULATOR_URL}
          className="h-full w-full rounded-xl border border-border bg-card"
          allow="clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <span>Emulator: esp32sim · MIT license · firmware execution is in your browser</span>
        <a href="https://github.com/mikroverk/esp32sim" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          Source and supported boards <ExternalLink className="size-3" />
        </a>
      </footer>
    </main>
  )
}
