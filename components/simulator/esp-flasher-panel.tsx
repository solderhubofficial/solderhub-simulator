"use client"

import { useMemo, useRef, useState } from "react"
import { Zap, Usb, Trash2, Copy, Moon, Sun, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/hooks/use-theme"
import { useEspFlasher } from "@/hooks/simulator/use-esp-flasher"
import {
  BAUD_RATE_OPTIONS,
  CUSTOM_BINARY_OPTION,
  DEFAULT_BAUD_RATE,
  FIRMWARE_LIBRARY,
} from "@/lib/simulator/flasher/firmware-library"

const FLASH_ADDRESS_HELP =
  "0x0 for a full merged binary (most Arduino/PlatformIO \"merged\" or \"factory\" builds), 0x10000 for an app-only image flashed alongside an existing bootloader/partition table."

export function EspFlasherPanel() {
  const { theme, toggleTheme } = useTheme()
  const [baudRate, setBaudRate] = useState<number>(DEFAULT_BAUD_RATE)
  const [firmwareChoice, setFirmwareChoice] = useState<string>(CUSTOM_BINARY_OPTION)
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [flashAddress, setFlashAddress] = useState<number>(0x0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const flasher = useEspFlasher(baudRate)

  const selectedLibraryEntry = useMemo(
    () => FIRMWARE_LIBRARY.find((f) => f.id === firmwareChoice),
    [firmwareChoice],
  )

  const isConnected = flasher.phase === "connected" || flasher.phase === "erasing" || flasher.phase === "flashing" || flasher.phase === "done"
  const isBusy = flasher.phase === "connecting" || flasher.phase === "erasing" || flasher.phase === "flashing"
  const canFlash = isConnected && !isBusy && (firmwareChoice === CUSTOM_BINARY_OPTION ? !!customFile : true)

  const handleFlash = async () => {
    let data: Uint8Array
    let address = flashAddress

    if (firmwareChoice === CUSTOM_BINARY_OPTION) {
      if (!customFile) return
      const buffer = await customFile.arrayBuffer()
      data = new Uint8Array(buffer)
    } else if (selectedLibraryEntry) {
      const res = await fetch(selectedLibraryEntry.url)
      const buffer = await res.arrayBuffer()
      data = new Uint8Array(buffer)
      address = selectedLibraryEntry.flashAddress
    } else {
      return
    }

    await flasher.flash({ data, address })
  }

  const copyLog = async () => {
    const text = flasher.logs.map((l) => l.text).join("\n")
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard can be unavailable -- non-critical
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <Zap className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">ESP Web Flasher</h1>
            <p className="text-xs text-muted-foreground">Flash real ESP32 hardware over USB</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={toggleTheme} className="gap-1.5">
            {theme === "dark" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {theme === "dark" ? "Dark" : "Light"}
          </Button>
          <Badge variant={flasher.isSupported ? "secondary" : "destructive"}>
            {flasher.isSupported ? "Chrome / Edge required" : "Unsupported browser"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          {/* Firmware card */}
          <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
            <header className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Zap className="size-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Firmware</h2>
            </header>

            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Firmware
            </label>
            <select
              value={firmwareChoice}
              onChange={(e) => setFirmwareChoice(e.target.value)}
              disabled={isBusy}
              className="mb-4 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value={CUSTOM_BINARY_OPTION}>Upload your own .bin…</option>
              {FIRMWARE_LIBRARY.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version}) [{f.target}]
                </option>
              ))}
            </select>

            {firmwareChoice === CUSTOM_BINARY_OPTION ? (
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin"
                  className="hidden"
                  onChange={(e) => setCustomFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="w-full justify-start"
                >
                  {customFile ? customFile.name : "Choose .bin file…"}
                </Button>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Export a merged/factory binary from Arduino IDE or PlatformIO, or a bare app image.
                </p>
              </div>
            ) : (
              selectedLibraryEntry && (
                <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
                  {selectedLibraryEntry.description}
                </p>
              )
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Baud rate
                </label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  disabled={isBusy}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {BAUD_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Target
                </label>
                <div className="flex h-9 items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-foreground">
                  {flasher.chipTarget ?? "Detect on connect"}
                </div>
              </div>
            </div>

            {firmwareChoice === CUSTOM_BINARY_OPTION && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Flash address
                </label>
                <select
                  value={flashAddress}
                  onChange={(e) => setFlashAddress(Number(e.target.value))}
                  disabled={isBusy}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value={0x0}>0x0 — full/merged binary</option>
                  <option value={0x10000}>0x10000 — app image only</option>
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{FLASH_ADDRESS_HELP}</p>
              </div>
            )}
          </section>

          {/* Connection + Flash cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Usb className="size-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Serial Connection</h2>
              </header>
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={`inline-block size-2 rounded-full ${
                    isConnected ? "bg-status-running" : "bg-muted-foreground/50"
                  }`}
                />
                {isConnected
                  ? flasher.chipDescription ?? "Connected"
                  : flasher.phase === "connecting"
                    ? "Connecting…"
                    : "No device connected"}
              </div>
              {isConnected ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={flasher.disconnect}
                  disabled={flasher.phase === "flashing" || flasher.phase === "erasing"}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={flasher.connect}
                  disabled={!flasher.isSupported || flasher.phase === "connecting"}
                >
                  Connect Device
                </Button>
              )}
            </section>

            <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
              <header className="mb-4 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Zap className="size-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Flash Firmware</h2>
              </header>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleFlash} disabled={!canFlash}>
                  {flasher.phase === "flashing" ? `Flashing… ${flasher.progress}%` : "Flash Now"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={flasher.eraseFlash}
                  disabled={!isConnected || isBusy}
                >
                  Erase
                </Button>
              </div>
            </section>
          </div>
        </div>

        {/* Log panel */}
        <section className="flex flex-col rounded-2xl border border-border/80 bg-card/90 shadow-sm">
          <header className="flex items-center justify-between border-b border-border/80 px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">ESP Flasher log</h2>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="ghost" onClick={copyLog} title="Copy log">
                <Copy className="size-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={flasher.clearLogs} title="Clear log">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </header>
          <div ref={logRef} className="min-h-[320px] flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
            {flasher.logs.length === 0 ? (
              <p className="text-muted-foreground">Log output will appear here once you connect a device.</p>
            ) : (
              flasher.logs.map((line) => (
                <div key={line.id} className="flex gap-2 text-muted-foreground">
                  <ChevronRight className="mt-0.5 size-3 shrink-0 opacity-40" />
                  <span className="whitespace-pre-wrap text-foreground/90">{line.text}</span>
                </div>
              ))
            )}
          </div>
          {(flasher.phase === "flashing" || flasher.phase === "erasing") && (
            <div className="h-1 w-full overflow-hidden rounded-b-2xl bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: flasher.phase === "flashing" ? `${flasher.progress}%` : "100%" }}
              />
            </div>
          )}
        </section>
      </div>

      {!flasher.isSupported && (
        <p className="text-center text-xs text-muted-foreground">
          Web Serial isn't available in this browser. Open this page in desktop Chrome or Edge to flash a device.
        </p>
      )}
    </div>
  )
}
