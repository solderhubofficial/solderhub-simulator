"use client"

import { useState } from "react"
import { ChevronDown, RotateCw, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useSimulator,
  useSelectedComponent,
  useSelectedWire,
} from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { cn } from "@/lib/utils"

export function PropertiesSidebar() {
  const { dispatch, getPinsForComponent, simulationResults } = useSimulator()
  const selected = useSelectedComponent()
  const selectedWire = useSelectedWire()
  const [pinsOpen, setPinsOpen] = useState(false)

  if (!selected && !selectedWire) {
    return null
  }

  if (selectedWire) {
    return (
      <aside className="absolute right-0 top-0 z-20 flex h-full w-[80vw] max-w-72 shrink-0 flex-col border-l border-border bg-card shadow-xl sm:w-56 lg:w-60">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Wire</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "SELECT_WIRE", id: null })}
            aria-label="Close panel"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Connection</p>
            <p className="font-mono text-foreground">{selectedWire.id.slice(0, 16)}…</p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="w-full gap-1.5"
            onClick={() => dispatch({ type: "REMOVE_WIRE", id: selectedWire.id })}
          >
            <Trash2 className="size-3.5" />
            Delete Wire
          </Button>
        </div>
      </aside>
    )
  }

  if (!selected) return null

  const def = getComponentDefinition(selected.type)
  const pins = getPinsForComponent(selected)
  const sim = simulationResults[selected.id]

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-[80vw] max-w-72 shrink-0 flex-col border-l border-border bg-card shadow-xl sm:w-56 lg:w-60">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{selected.name}</h2>
          <p className="text-xs text-muted-foreground">{selected.type}</p>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "SELECT_COMPONENT", id: null })}
          aria-label="Close panel"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Position */}
        <PropertyGroup label="Position">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <PropField label="X" value={Math.round(selected.x)} />
            <PropField label="Y" value={Math.round(selected.y)} />
            <PropField label="Rotation" value={`${selected.rotation}°`} />
          </div>
        </PropertyGroup>

        {/* Type-specific metadata */}
        {selected.type === "resistor" && (
          <PropertyGroup label="Resistance">
            <input
              type="number"
              value={typeof selected.metadata.resistance === "number" ? selected.metadata.resistance : 220}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_METADATA",
                  id: selected.id,
                  metadata: { resistance: Number(e.target.value) },
                })
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            />
          </PropertyGroup>
        )}

        {selected.type === "led" && (
          <PropertyGroup label="Color">
            <select
              value={typeof selected.metadata.color === "string" ? selected.metadata.color : "red"}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_METADATA",
                  id: selected.id,
                  metadata: { color: e.target.value },
                })
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="red">Red</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="yellow">Yellow</option>
            </select>
          </PropertyGroup>
        )}

        {selected.type === "push-button" && (
          <PropertyGroup label="State">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={selected.metadata.pressed === true}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_METADATA",
                    id: selected.id,
                    metadata: { pressed: e.target.checked },
                  })
                }
                className="rounded border-border"
              />
              Pressed
            </label>
          </PropertyGroup>
        )}

        {selected.type === "potentiometer" && (
          <PropertyGroup label="Position">
            <input
              type="range"
              min={0}
              max={100}
              value={
                typeof selected.metadata.position === "number"
                  ? Math.round(selected.metadata.position * 100)
                  : 50
              }
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_METADATA",
                  id: selected.id,
                  metadata: { position: Number(e.target.value) / 100 },
                })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground text-center">
              {typeof selected.metadata.position === "number"
                ? Math.round(selected.metadata.position * 100)
                : 50}
              %
            </p>
          </PropertyGroup>
        )}

        {selected.type === "arduino-uno" && (
          <PropertyGroup label="Digital Outputs">
            {["D13", "D12", "D11", "D10", "D9", "D8"].map((pinName) => {
              const pinModes = (selected.metadata.pinModes ?? {}) as Record<string, string>
              const pinValues = (selected.metadata.pinValues ?? {}) as Record<string, number>
              const isOutput = pinModes[pinName] === "OUTPUT"
              return (
                <div key={pinName} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{pinName}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_METADATA",
                          id: selected.id,
                          metadata: {
                            pinModes: { ...pinModes, [pinName]: isOutput ? "INPUT" : "OUTPUT" },
                          },
                        })
                      }
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        isOutput ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isOutput ? "OUT" : "IN"}
                    </button>
                    {isOutput && (
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_METADATA",
                            id: selected.id,
                            metadata: {
                              pinValues: {
                                ...pinValues,
                                [pinName]: (pinValues[pinName] ?? 0) >= 1 ? 0 : 1,
                              },
                            },
                          })
                        }
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-mono font-medium",
                          (pinValues[pinName] ?? 0) >= 1
                            ? "bg-green-500/20 text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {(pinValues[pinName] ?? 0) >= 1 ? "HIGH" : "LOW"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </PropertyGroup>
        )}

        {/* Simulation state */}
        {sim && Object.keys(sim.flags).length > 0 && (
          <PropertyGroup label="Simulation">
            {Object.entries(sim.flags).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-mono text-foreground">{String(val)}</span>
              </div>
            ))}
          </PropertyGroup>
        )}

        {/* Pins list — collapsed by default; click to inspect */}
        <div>
          <button
            type="button"
            onClick={() => setPinsOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <span>Pins ({pins.length})</span>
            <ChevronDown className={cn("size-3.5 transition-transform", pinsOpen && "rotate-180")} />
          </button>
          {pinsOpen && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-background/50 p-1.5 space-y-0.5">
              {pins.slice(0, 40).map((pin) => {
                const pinSim = sim?.pinStates[pin.id]
                return (
                  <div key={pin.id} className="flex justify-between text-[10px]">
                    <span className="font-mono text-muted-foreground">{pin.name}</span>
                    <span className={cn(
                      "font-mono",
                      pinSim?.state === "HIGH" ? "text-green-400" :
                      pinSim?.state === "LOW" ? "text-blue-400" : "text-muted-foreground"
                    )}>
                      {pinSim?.state ?? "—"}
                    </span>
                  </div>
                )
              })}
              {pins.length > 40 && (
                <p className="text-[10px] text-muted-foreground">+{pins.length - 40} more</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => dispatch({ type: "ROTATE_COMPONENT", id: selected.id })}
          >
            <RotateCw className="size-3.5" />
            Rotate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 gap-1"
            onClick={() => dispatch({ type: "REMOVE_COMPONENT", id: selected.id })}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </aside>
  )
}

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  )
}

function PropField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-mono text-xs text-foreground">{value}</p>
    </div>
  )
}
