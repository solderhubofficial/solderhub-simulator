"use client"

import { useMemo, useRef } from "react"
import { Usb, FileUp, Zap, Eraser } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FlasherPhase } from "@/hooks/simulator/use-esp-flasher"
import {
  BAUD_RATE_OPTIONS,
  CUSTOM_BINARY_OPTION,
  FIRMWARE_LIBRARY,
  type FirmwareLibraryEntry,
} from "@/lib/simulator/flasher/firmware-library"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
const fieldLabelClass = "mb-1.5 block text-[11px] font-medium text-muted-foreground"

// -- Step 1: Connect -------------------------------------------------------

interface ConnectStepProps {
  isSupported: boolean
  phase: FlasherPhase
  isConnected: boolean
  chipDescription: string | null
  portInfo: string | null
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectStep({
  isSupported,
  phase,
  isConnected,
  chipDescription,
  portInfo,
  onConnect,
  onDisconnect,
}: ConnectStepProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Connect your board</h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Plug the board in over USB, then select it from the browser&apos;s port picker. Most ESP32 dev boards
          (DevKit, NodeMCU-32S, WROOM boards with onboard USB) reset into bootloader mode automatically — a bare
          ESP32-CAM behind a USB-serial adapter needs GPIO0 held to GND first.
        </p>

        {!isSupported && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This browser doesn&apos;t support Web Serial. Open this page in desktop Chrome or Edge.
          </p>
        )}

        {isConnected && (
          <dl className="mt-5 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-border/80 bg-muted/40 p-4 font-mono text-xs">
            <dt className="text-muted-foreground">Chip</dt>
            <dd className="text-foreground">{chipDescription}</dd>
            <dt className="text-muted-foreground">Port</dt>
            <dd className="text-foreground">{portInfo}</dd>
          </dl>
        )}
      </div>

      <div>
        {isConnected ? (
          <Button variant="outline" onClick={onDisconnect} className="gap-2">
            <Usb className="size-4" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={onConnect} disabled={!isSupported || phase === "connecting"} className="gap-2">
            <Usb className="size-4" />
            {phase === "connecting" ? "Connecting…" : "Connect device"}
          </Button>
        )}
      </div>
    </div>
  )
}

// -- Step 2: Firmware -------------------------------------------------------

interface FirmwareStepProps {
  firmwareChoice: string
  onFirmwareChoiceChange: (id: string) => void
  customFile: File | null
  onCustomFileChange: (file: File | null) => void
  flashAddress: number
  onFlashAddressChange: (address: number) => void
  baudRate: number
  onBaudRateChange: (rate: number) => void
  disabled: boolean
}

export function FirmwareStep({
  firmwareChoice,
  onFirmwareChoiceChange,
  customFile,
  onCustomFileChange,
  flashAddress,
  onFlashAddressChange,
  baudRate,
  onBaudRateChange,
  disabled,
}: FirmwareStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedLibraryEntry = useMemo(
    () => FIRMWARE_LIBRARY.find((f) => f.id === firmwareChoice),
    [firmwareChoice],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Choose firmware</h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Upload a .bin built with Arduino IDE, PlatformIO, or ESP-IDF.
        </p>
      </div>

      <div className="max-w-md">
        <label className={fieldLabelClass}>Firmware</label>
        <select
          value={firmwareChoice}
          onChange={(e) => onFirmwareChoiceChange(e.target.value)}
          disabled={disabled}
          className={selectClass}
        >
          <option value={CUSTOM_BINARY_OPTION}>Upload your own .bin…</option>
          {FIRMWARE_LIBRARY.map((f: FirmwareLibraryEntry) => (
            <option key={f.id} value={f.id}>
              {f.name} (v{f.version}) [{f.target}]
            </option>
          ))}
        </select>

        {firmwareChoice === CUSTOM_BINARY_OPTION ? (
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".bin"
              className="hidden"
              onChange={(e) => onCustomFileChange(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-full justify-start gap-2"
            >
              <FileUp className="size-3.5" />
              {customFile ? customFile.name : "Choose .bin file…"}
            </Button>
          </div>
        ) : (
          selectedLibraryEntry && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {selectedLibraryEntry.description}
            </p>
          )
        )}
      </div>

      <div className="grid max-w-md grid-cols-2 gap-4">
        <div>
          <label className={fieldLabelClass}>Baud rate</label>
          <select
            value={baudRate}
            onChange={(e) => onBaudRateChange(Number(e.target.value))}
            disabled={disabled}
            className={selectClass}
          >
            {BAUD_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {firmwareChoice === CUSTOM_BINARY_OPTION && (
          <div>
            <label className={fieldLabelClass}>Flash address</label>
            <select
              value={flashAddress}
              onChange={(e) => onFlashAddressChange(Number(e.target.value))}
              disabled={disabled}
              className={selectClass}
            >
              <option value={0x0}>0x0 — full/merged binary</option>
              <option value={0x10000}>0x10000 — app image only</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

// -- Step 3: Flash -----------------------------------------------------------

interface FlashStepProps {
  phase: FlasherPhase
  progress: number
  canFlash: boolean
  isConnected: boolean
  isBusy: boolean
  onFlash: () => void
  onErase: () => void
}

export function FlashStep({ phase, progress, canFlash, isConnected, isBusy, onFlash, onErase }: FlashStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Write to the board</h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Flashing keeps the board&apos;s existing flash mode, frequency, and size settings. Erase first only if
          you&apos;re switching between firmware that expects a clean partition table.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onFlash} disabled={!canFlash} className="gap-2">
          <Zap className="size-4" />
          {phase === "flashing" ? `Flashing… ${progress}%` : "Flash now"}
        </Button>
        <Button variant="outline" onClick={onErase} disabled={!isConnected || isBusy} className="gap-2">
          <Eraser className="size-4" />
          Erase flash
        </Button>
      </div>

      {phase === "done" && (
        <p className="max-w-md rounded-lg border border-status-running/30 bg-status-running/10 px-3 py-2 text-sm text-status-running">
          Flash complete — the board has been reset and is running the new firmware.
        </p>
      )}
    </div>
  )
}
