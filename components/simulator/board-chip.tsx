"use client"

import { Cpu } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getBoardSupport } from "@/lib/simulator/board-support"
import { cn } from "@/lib/utils"

const BOARD_TYPE = /^(arduino-|esp32|nodemcu|stm32|raspberry-pi)/

/** Names the board on the canvas and says plainly whether code runs on it. */
export function BoardChip() {
  const { state } = useSimulator()
  const board = state.components.find((c) => BOARD_TYPE.test(c.type))
  const info = board ? getBoardSupport(board.type) : null
  const label = info?.label ?? (board ? board.name : null)

  const open = () => window.dispatchEvent(new CustomEvent("simulator:open-parts"))

  if (!board) {
    return (
      <button type="button" onClick={open} className="hidden h-9 shrink-0 items-center gap-2 rounded-full border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground md:inline-flex">
        <Cpu className="size-3.5" /> Add a board
      </button>
    )
  }
  const runs = info?.support === "runtime"
  return (
    <button type="button" onClick={open} title={info?.note ? `${info.label} ${info.note}` : "Change board"} className="hidden h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/60 md:inline-flex">
      <span className={cn("size-2 rounded-full", runs ? "bg-status-running" : "bg-status-idle")} />
      <span className="max-w-[10rem] truncate">{label}</span>
      {info && <span className={cn("font-semibold", runs ? "text-status-running" : "text-status-idle")}>{runs ? "Runs" : "Preview only"}</span>}
    </button>
  )
}
