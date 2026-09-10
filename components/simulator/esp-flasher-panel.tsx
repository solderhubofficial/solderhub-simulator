"use client"

import { useEffect, useMemo, useState } from "react"
import { Sun, Moon, CircuitBoard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"
import { useEspFlasher } from "@/hooks/simulator/use-esp-flasher"
import { CUSTOM_BINARY_OPTION, DEFAULT_BAUD_RATE, getFirmwareLibraryEntry } from "@/lib/simulator/flasher/firmware-library"
import { FlasherStepRail, type FlasherStepId } from "@/components/simulator/flasher/flasher-step-rail"
import { FlasherTerminal } from "@/components/simulator/flasher/flasher-terminal"
import { ConnectStep, FirmwareStep, FlashStep } from "@/components/simulator/flasher/flasher-steps"

export function EspFlasherPanel() {
  const { theme, toggleTheme } = useTheme()
  const [baudRate, setBaudRate] = useState<number>(DEFAULT_BAUD_RATE)
  const [firmwareChoice, setFirmwareChoice] = useState<string>(CUSTOM_BINARY_OPTION)
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [flashAddress, setFlashAddress] = useState<number>(0x0)
  const [activeStep, setActiveStep] = useState<FlasherStepId>("connect")

  const flasher = useEspFlasher(baudRate)

  const isConnected =
    flasher.phase === "connected" || flasher.phase === "erasing" || flasher.phase === "flashing" || flasher.phase === "done"
  const isBusy = flasher.phase === "connecting" || flasher.phase === "erasing" || flasher.phase === "flashing"
  const hasFirmwareSelected = firmwareChoice === CUSTOM_BINARY_OPTION ? !!customFile : true
  const canFlash = isConnected && !isBusy && hasFirmwareSelected

  // Move the person forward automatically on a real state change (connecting
  // succeeded) but never fight their own navigation between steps otherwise.
  useEffect(() => {
    if (isConnected && activeStep === "connect") setActiveStep("firmware")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  const completedSteps = useMemo(() => {
    const done = new Set<FlasherStepId>()
    if (isConnected) done.add("connect")
    if (hasFirmwareSelected) done.add("firmware")
    if (flasher.phase === "done") done.add("flash")
    return done
  }, [isConnected, hasFirmwareSelected, flasher.phase])

  const disabledSteps = useMemo(() => {
    const disabled = new Set<FlasherStepId>()
    if (!isConnected) disabled.add("flash")
    return disabled
  }, [isConnected])

  const handleFlash = async () => {
    let data: Uint8Array
    let address = flashAddress

    if (firmwareChoice === CUSTOM_BINARY_OPTION) {
      if (!customFile) return
      data = new Uint8Array(await customFile.arrayBuffer())
    } else {
      const entry = getFirmwareLibraryEntry(firmwareChoice)
      if (!entry) return
      const res = await fetch(entry.url)
      data = new Uint8Array(await res.arrayBuffer())
      address = entry.flashAddress
    }

    setActiveStep("flash")
    await flasher.flash({ data, address })
  }

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(flasher.logs.map((l) => l.text).join("\n"))
    } catch {
      // clipboard can be unavailable -- non-critical
    }
  }

  const sessionLabel = isConnected
    ? `esp-flasher — ${flasher.chipTarget ?? "device"} @ ${baudRate.toLocaleString()} baud`
    : "esp-flasher — no device"

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      {/* Device status header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <CircuitBoard className="size-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">ESP Flasher</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`inline-block size-1.5 rounded-full ${isConnected ? "bg-status-running" : "bg-muted-foreground/50"}`}
              />
              {isConnected ? (flasher.chipDescription ?? "Connected") : "No device connected"}
            </div>
          </div>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={toggleTheme} className="size-8 self-end sm:self-auto">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      {/* Main workspace */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <FlasherStepRail
          activeStep={activeStep}
          completedSteps={completedSteps}
          disabledSteps={disabledSteps}
          onSelectStep={setActiveStep}
        />

        <div className="min-w-0 flex-1 rounded-xl border border-border/80 bg-card/90 p-5 shadow-sm lg:min-h-[420px]">
          {activeStep === "connect" && (
            <ConnectStep
              isSupported={flasher.isSupported}
              phase={flasher.phase}
              isConnected={isConnected}
              chipDescription={flasher.chipDescription}
              portInfo={flasher.portInfo}
              onConnect={flasher.connect}
              onDisconnect={flasher.disconnect}
            />
          )}
          {activeStep === "firmware" && (
            <FirmwareStep
              firmwareChoice={firmwareChoice}
              onFirmwareChoiceChange={setFirmwareChoice}
              customFile={customFile}
              onCustomFileChange={setCustomFile}
              flashAddress={flashAddress}
              onFlashAddressChange={setFlashAddress}
              baudRate={baudRate}
              onBaudRateChange={setBaudRate}
              disabled={isBusy}
            />
          )}
          {activeStep === "flash" && (
            <FlashStep
              phase={flasher.phase}
              progress={flasher.progress}
              canFlash={canFlash}
              isConnected={isConnected}
              isBusy={isBusy}
              onFlash={handleFlash}
              onErase={flasher.eraseFlash}
            />
          )}
        </div>

        <div className="w-full lg:w-[380px] lg:shrink-0">
          <FlasherTerminal
            logs={flasher.logs}
            phase={flasher.phase}
            progress={flasher.progress}
            bytesWritten={flasher.bytesWritten}
            bytesTotal={flasher.bytesTotal}
            sessionLabel={sessionLabel}
            onCopy={copyLog}
            onClear={flasher.clearLogs}
          />
        </div>
      </div>

      {!flasher.isSupported && (
        <p className="text-center text-xs text-muted-foreground">
          Web Serial isn&apos;t available in this browser. Open this page in desktop Chrome or Edge to flash a device.
        </p>
      )}
    </div>
  )
}
