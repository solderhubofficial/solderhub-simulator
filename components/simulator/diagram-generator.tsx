"use client"

import { useMemo, useRef, useState } from "react"
import { Download, X, Cable, LayoutGrid, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { getPinWorldPosition, rotatePoint } from "@/lib/simulator/utils/geometry"
import type { ComponentPin, PlacedComponent, Wire } from "@/types/simulator"

type DiagramView = "wiring" | "breadboard"

const PAD = 64
const COLORS: Record<string, string> = {
  power: "#dc2626",
  ground: "#111827",
  digital: "#2563eb",
  analog: "#d97706",
  passive: "#64748b",
}

function wireColor(from: ComponentPin | undefined, to: ComponentPin | undefined) {
  if (from?.type === "ground" || to?.type === "ground") return COLORS.ground
  if (from?.type === "power" || to?.type === "power") return COLORS.power
  if (from?.type === "analog" || to?.type === "analog") return COLORS.analog
  return COLORS.digital
}

function pathBetween(x1: number, y1: number, x2: number, y2: number) {
  const midX = Math.round((x1 + x2) / 2)
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[char] ?? char)
}

export function DiagramGenerator({ onClose }: { onClose: () => void }) {
  const { state, getPinsForComponent } = useSimulator()
  const [view, setView] = useState<DiagramView>("wiring")
  const [showPinLabels, setShowPinLabels] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  const model = useMemo(() => {
    const components = state.components.map((component) => {
      const definition = getComponentDefinition(component.type)
      const pins = getPinsForComponent(component)
      return { component, definition, pins }
    })
    const pinById = new Map<string, { component: PlacedComponent; pin: ComponentPin }>()
    for (const entry of components) {
      for (const pin of entry.pins) pinById.set(pin.id, { component: entry.component, pin })
    }
    const validWires = state.wires.filter((wire) =>
      pinById.has(wire.fromPinId) && pinById.has(wire.toPinId) &&
      pinById.get(wire.fromPinId)?.component.id === wire.fromComponentId &&
      pinById.get(wire.toPinId)?.component.id === wire.toComponentId
    )
    const invalidWires = state.wires.length - validWires.length
    const positioned = components.map((entry) => {
      const width = entry.definition?.width ?? 120
      const height = entry.definition?.height ?? 72
      return { ...entry, width, height }
    })
    const bounds = positioned.flatMap(({ component, width, height }) =>
      [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: 0, y: height },
        { x: width, y: height },
      ].map((corner) => {
        const rotated = rotatePoint(corner.x, corner.y, component.rotation)
        return { x: component.x + rotated.x, y: component.y + rotated.y }
      })
    )
    const minX = Math.min(0, ...bounds.map((point) => point.x)) - 24
    const minY = Math.min(0, ...bounds.map((point) => point.y)) - 24
    const maxX = Math.max(640, ...bounds.map((point) => point.x)) + 24
    const maxY = Math.max(360, ...bounds.map((point) => point.y)) + 24
    const width = maxX - minX + PAD * 2
    const height = maxY - minY + PAD * 2
    return { positioned, pinById, validWires, invalidWires, minX, minY, width, height }
  }, [state.components, state.wires, getPinsForComponent])

  const offset = (point: { x: number; y: number }) => ({
    x: point.x - model.minX + PAD,
    y: point.y - model.minY + PAD,
  })

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clone.setAttribute("width", String(Math.ceil(model.width)))
    clone.setAttribute("height", String(Math.ceil(model.height)))
    const serialized = new XMLSerializer().serializeToString(clone)
    triggerDownload(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }), `solderhub-${view}-diagram.svg`)
  }

  const exportPng = async () => {
    const svg = svgRef.current
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    clone.setAttribute("width", String(Math.ceil(model.width)))
    clone.setAttribute("height", String(Math.ceil(model.height)))
    const source = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.decoding = "async"
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error("The diagram could not be rendered as an image."))
      })
      image.src = url
      await loaded
      const canvas = document.createElement("canvas")
      canvas.width = Math.ceil(model.width * 2)
      canvas.height = Math.ceil(model.height * 2)
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas export is not supported in this browser.")
      context.scale(2, 2)
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, model.width, model.height)
      context.drawImage(image, 0, 0, model.width, model.height)
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG export failed.")), "image/png")
      )
      triggerDownload(png, `solderhub-${view}-diagram.png`)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "PNG export failed.")
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Wiring diagram generator">
      <section className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Wiring Diagram Generator</h2>
            <p className="text-xs text-muted-foreground">Generated from the current simulator circuit</p>
          </div>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close diagram generator"><X className="size-4" /></Button>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Button size="sm" variant={view === "wiring" ? "default" : "outline"} onClick={() => setView("wiring")}><Cable className="mr-1.5 size-4" />Pin-to-pin</Button>
          <Button size="sm" variant={view === "breadboard" ? "default" : "outline"} onClick={() => setView("breadboard")}><LayoutGrid className="mr-1.5 size-4" />Breadboard style</Button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPinLabels} onChange={(event) => setShowPinLabels(event.target.checked)} />
            Pin labels
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-5">
          {state.components.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Cable className="size-8" />
              <p className="font-medium">Add components to your circuit first</p>
              <p className="text-sm">Close this window, place components, connect their pins, and generate the diagram again.</p>
            </div>
          ) : (
            <>
              {model.invalidWires > 0 && <p className="mb-3 flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="size-4" />{model.invalidWires} invalid connection(s) were omitted. Check the simulator circuit.</p>}
              <div className="overflow-auto rounded-lg border border-border bg-white shadow-sm">
                <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${model.width} ${model.height}`} width={model.width} height={model.height} role="img" aria-label={view === "wiring" ? "Pin-to-pin circuit wiring diagram" : "Breadboard-style circuit layout"} style={{ display: "block", maxWidth: "none", background: "#ffffff" }}>
                  <rect width={model.width} height={model.height} fill="#fff" />
                  {view === "breadboard" && (
                    <g opacity="0.48">
                      {Array.from({ length: Math.ceil(model.width / 20) }, (_, i) => <line key={`gx${i}`} x1={i * 20} y1="0" x2={i * 20} y2={model.height} stroke="#e2e8f0" strokeWidth="1" />)}
                      {Array.from({ length: Math.ceil(model.height / 20) }, (_, i) => <line key={`gy${i}`} x1="0" y1={i * 20} x2={model.width} y2={i * 20} stroke="#e2e8f0" strokeWidth="1" />)}
                    </g>
                  )}
                  <g>
                    {model.validWires.map((wire: Wire) => {
                      const from = model.pinById.get(wire.fromPinId)
                      const to = model.pinById.get(wire.toPinId)
                      if (!from || !to) return null
                      const a = offset(getPinWorldPosition(from.component, from.pin))
                      const b = offset(getPinWorldPosition(to.component, to.pin))
                      return <path key={wire.id} d={pathBetween(a.x, a.y, b.x, b.y)} fill="none" stroke={wireColor(from.pin, to.pin)} strokeWidth={view === "breadboard" ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" />
                    })}
                  </g>
                  {model.positioned.map(({ component, definition, pins, width, height }) => {
                    const x = component.x - model.minX + PAD
                    const y = component.y - model.minY + PAD
                    return (
                      <g key={component.id} transform={`translate(${x} ${y}) rotate(${component.rotation})`}>
                        <rect x="0" y="0" width={width} height={height} rx={view === "breadboard" ? 5 : 9} fill={view === "breadboard" ? "#f8fafc" : "#eff6ff"} stroke={view === "breadboard" ? "#94a3b8" : "#2563eb"} strokeWidth="1.5" />
                        <text x={width / 2} y={Math.min(height / 2, 24)} textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="600" fill="#0f172a">{escapeXml(component.name || definition?.name || component.type)}</text>
                        {pins.map((pin) => {
                          const px = pin.x
                          const py = pin.y
                          return (
                            <g key={pin.id}>
                              <circle cx={px} cy={py} r="4" fill={COLORS[pin.type] ?? COLORS.passive} stroke="#fff" strokeWidth="1" />
                              {showPinLabels && <text x={px + (px < width / 2 ? -6 : 6)} y={py - 5} textAnchor={px < width / 2 ? "end" : "start"} fontFamily="Arial, sans-serif" fontSize="9" fill="#334155">{escapeXml(pin.name)}</text>}
                            </g>
                          )
                        })}
                      </g>
                    )
                  })}
                  <g>
                    <text x={PAD} y={model.height - 24} fontFamily="Arial, sans-serif" fontSize="11" fill="#64748b">SolderHub · {view === "wiring" ? "Pin-to-pin wiring" : "Breadboard-style layout"} · {model.validWires.length} connections</text>
                    <g transform={`translate(${model.width - 210} 18)`}>
                      <rect width="190" height="70" rx="6" fill="#fff" stroke="#cbd5e1" />
                      <text x="10" y="16" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="600" fill="#334155">WIRE LEGEND</text>
                      <line x1="12" y1="30" x2="32" y2="30" stroke={COLORS.power} strokeWidth="3" /><text x="38" y="33" fontFamily="Arial, sans-serif" fontSize="10" fill="#334155">Power</text>
                      <line x1="98" y1="30" x2="118" y2="30" stroke={COLORS.ground} strokeWidth="3" /><text x="124" y="33" fontFamily="Arial, sans-serif" fontSize="10" fill="#334155">Ground</text>
                      <line x1="12" y1="49" x2="32" y2="49" stroke={COLORS.digital} strokeWidth="3" /><text x="38" y="52" fontFamily="Arial, sans-serif" fontSize="10" fill="#334155">Digital</text>
                      <line x1="98" y1="49" x2="118" y2="49" stroke={COLORS.analog} strokeWidth="3" /><text x="124" y="52" fontFamily="Arial, sans-serif" fontSize="10" fill="#334155">Analog</text>
                    </g>
                  </g>
                </svg>
              </div>
              {view === "breadboard" && <p className="mt-2 text-xs text-muted-foreground">This initial breadboard-style view visualizes the current component positions on a grid. It does not yet validate physical breadboard hole placement or component fit.</p>}
            </>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{state.components.length} components · {model.validWires.length} valid wires</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportSvg} disabled={state.components.length === 0}><Download className="mr-1.5 size-4" />Export SVG</Button>
            <Button size="sm" onClick={exportPng} disabled={state.components.length === 0}><Download className="mr-1.5 size-4" />Export PNG</Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
