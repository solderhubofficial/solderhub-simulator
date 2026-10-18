"use client"

import { useMemo, useState } from "react"
import { Box, RotateCw, RotateCcw, Scan } from "lucide-react"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { getPinWorldPosition, rotatePoint } from "@/lib/simulator/utils/geometry"
import type { ComponentPin, PlacedComponent } from "@/types/simulator"

type Point3 = { x: number; y: number }
type ProjectedComponent = {
  component: PlacedComponent
  name: string
  color: string
  corners: Point3[]
  center: Point3
  pins: { id: string; name: string; point: Point3 }[]
}

const palette: Record<string, string> = {
  "arduino-uno": "#1687bd",
  "esp32-devkit": "#1d4ed8",
  "breadboard": "#e9edf2",
  "raspberry-pi-5": "#b91c1c",
  "a3144": "#16804a",
  "hc-sr04": "#1476c7",
  "led": "#e87924",
  "resistor": "#d6b778",
  "servo": "#d1d5db",
  "rc522": "#1764b2",
  "oled-13": "#263548",
}

function colorFor(type: string, category: string) {
  return palette[type] ?? (category === "board" ? "#1769aa" : category === "passive" ? "#d9dfe7" : "#247a68")
}

function rotateLocal(component: PlacedComponent, x: number, y: number) {
  const rotated = rotatePoint(x, y, component.rotation)
  return { x: component.x + rotated.x, y: component.y + rotated.y }
}

export function ThreeDWorkbench() {
  const { state, getPinsForComponent, dispatch } = useSimulator()
  const [cameraRotation, setCameraRotation] = useState(0)
  const [showPins, setShowPins] = useState(true)

  const scene = useMemo(() => {
    const project = (x: number, y: number, z = 0): Point3 => {
      const angle = (cameraRotation * Math.PI) / 180
      const rx = x * Math.cos(angle) - y * Math.sin(angle)
      const ry = x * Math.sin(angle) + y * Math.cos(angle)
      return { x: (rx - ry) * 0.72, y: (rx + ry) * 0.34 - z }
    }
    const items: ProjectedComponent[] = state.components.flatMap((component) => {
      const def = getComponentDefinition(component.type)
      if (!def) return []
      const localCorners = [
        [0, 0], [def.width, 0], [def.width, def.height], [0, def.height],
      ]
      const corners = localCorners.map(([x, y]) => {
        const world = rotateLocal(component, x!, y!)
        return project(world.x, world.y, 16)
      })
      const centerWorld = rotateLocal(component, def.width / 2, def.height / 2)
      const center = project(centerWorld.x, centerWorld.y, 18)
      const pins = getPinsForComponent(component).map((pin: ComponentPin) => {
        const world = getPinWorldPosition(component, pin)
        return { id: pin.id, name: pin.name, point: project(world.x, world.y, 19) }
      })
      return [{
        component,
        name: def.name,
        color: colorFor(component.type, def.category),
        corners,
        center,
        pins,
      }]
    })

    const wirePoints = state.wires.flatMap((wire) => {
      const from = state.components.find((item) => item.id === wire.fromComponentId)
      const to = state.components.find((item) => item.id === wire.toComponentId)
      if (!from || !to) return []
      const fromPin = getPinsForComponent(from).find((pin) => pin.id === wire.fromPinId)
      const toPin = getPinsForComponent(to).find((pin) => pin.id === wire.toPinId)
      if (!fromPin || !toPin) return []
      const a = getPinWorldPosition(from, fromPin)
      const b = getPinWorldPosition(to, toPin)
      return [{ id: wire.id, color: wire.color || (wire.id.length % 2 ? "#f59e0b" : "#38bdf8"), a: project(a.x, a.y, 25), b: project(b.x, b.y, 25) }]
    })

    const points = [
      ...items.flatMap((item) => item.corners),
      ...items.map((item) => item.center),
      ...items.flatMap((item) => item.pins.map((pin) => pin.point)),
      ...wirePoints.flatMap((wire) => [wire.a, wire.b]),
    ]
    const minX = points.length ? Math.min(...points.map((p) => p.x)) : -400
    const maxX = points.length ? Math.max(...points.map((p) => p.x)) : 400
    const minY = points.length ? Math.min(...points.map((p) => p.y)) : -250
    const maxY = points.length ? Math.max(...points.map((p) => p.y)) : 250
    const pad = 110
    return {
      items,
      wirePoints,
      viewBox: `${minX - pad} ${minY - pad} ${Math.max(500, maxX - minX + pad * 2)} ${Math.max(340, maxY - minY + pad * 2)}`,
      project,
    }
  }, [cameraRotation, state.components, state.wires, getPinsForComponent])

  if (state.components.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden bg-[#07111f] p-6 text-center text-white">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><Box className="size-8" /></div>
        <h2 className="text-xl font-bold">Explore your circuit in 3D</h2>
        <p className="max-w-sm text-sm leading-6 text-slate-400">Add a board and components in 2D first, then switch here to inspect the circuit from an isometric angle.</p>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("simulator:open-parts"))} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 hover:bg-sky-400">Open parts library</button>
      </div>
    )
  }

  return (
    <section className="absolute inset-0 overflow-hidden bg-[#07111f] text-white" aria-label="Isometric 3D circuit view">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(ellipse at 50% 45%, rgba(29,78,216,.18), transparent 58%), linear-gradient(rgba(99,145,190,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(99,145,190,.055) 1px, transparent 1px)", backgroundSize: "auto, 28px 28px, 28px 28px" }} />
      <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0b1727]/90 p-2 shadow-xl backdrop-blur-md sm:left-5 sm:top-5">
        <span className="flex items-center gap-2 px-1 text-xs font-bold tracking-wide text-sky-200"><Box className="size-4" /> ISOMETRIC VIEW</span>
        <span className="h-5 w-px bg-white/10" />
        <button type="button" onClick={() => setCameraRotation((value) => (value + 90) % 360)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10" aria-label="Rotate view clockwise" title="Rotate view"><RotateCw className="size-3.5" /><span className="hidden sm:inline">Rotate</span></button>
        <button type="button" onClick={() => setCameraRotation(0)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10" title="Reset view"><Scan className="size-3.5" /><span className="hidden sm:inline">Reset</span></button>
        <button type="button" onClick={() => setShowPins((value) => !value)} aria-pressed={showPins} className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${showPins ? "border-sky-400/40 bg-sky-400/10 text-sky-200" : "border-white/10 text-slate-300 hover:bg-white/10"}`}>Pins</button>
      </div>

      <svg className="absolute inset-0 size-full" viewBox={scene.viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Isometric projection of the current circuit with raised components and connecting wires">
        <defs>
          <linearGradient id="sh3d-board" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#248ec2" /><stop offset="100%" stopColor="#0c3b61" /></linearGradient>
          <linearGradient id="sh3d-breadboard" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#c9d3df" /></linearGradient>
          <filter id="sh3d-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000814" floodOpacity=".65" /></filter>
          <pattern id="sh3d-holes" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#475569" opacity=".8" /><circle cx="4" cy="4" r=".7" fill="#0f172a" /></pattern>
        </defs>
        {scene.wirePoints.map((wire) => {
          const midX = (wire.a.x + wire.b.x) / 2
          const lift = Math.max(24, Math.abs(wire.b.x - wire.a.x) * 0.08)
          const path = `M ${wire.a.x} ${wire.a.y} C ${midX} ${wire.a.y - lift}, ${midX} ${wire.b.y - lift}, ${wire.b.x} ${wire.b.y}`
          return <g key={wire.id}><path d={path} fill="none" stroke="#020617" strokeWidth="7" strokeLinecap="round" opacity=".7" /><path d={path} fill="none" stroke={wire.color} strokeWidth="3.5" strokeLinecap="round" /><path d={path} fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity=".35" /></g>
        })}
        {scene.items.map((item) => {
          const [a, b, c, d] = item.corners
          if (!a || !b || !c || !d) return null
          const selected = state.selectedComponentId === item.component.id
          const color = item.color
          const bottom = [a, b, c, d].map((point) => ({ x: point.x, y: point.y + 15 }))
          const fill = item.component.type === "breadboard" ? "url(#sh3d-breadboard)" : item.component.type === "arduino-uno" ? "url(#sh3d-board)" : color
          return <g key={item.component.id} filter="url(#sh3d-shadow)" onClick={() => dispatch({ type: "SELECT_COMPONENT", id: item.component.id })} className="cursor-pointer">
            <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${bottom[1]!.x},${bottom[1]!.y} ${bottom[0]!.x},${bottom[0]!.y}`} fill="#020617" opacity=".85" />
            <polygon points={`${b.x},${b.y} ${c.x},${c.y} ${bottom[2]!.x},${bottom[2]!.y} ${bottom[1]!.x},${bottom[1]!.y}`} fill="#0b1c2e" />
            <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`} fill={fill} stroke={selected ? "#fbbf24" : "#dbeafe"} strokeOpacity={selected ? 1 : .45} strokeWidth={selected ? 3 : 1.2} />
            {item.component.type === "breadboard" && <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`} fill="url(#sh3d-holes)" opacity=".8" />}
            {item.component.type !== "breadboard" && <g opacity=".65">{item.corners.map((p, i) => <circle key={i} cx={p.x * .75 + item.center.x * .25} cy={p.y * .75 + item.center.y * .25} r="3.5" fill="#dbeafe" />)}</g>}
            <text x={item.center.x} y={item.center.y} fill={item.component.type === "breadboard" || item.component.type === "resistor" ? "#1e293b" : "#f8fafc"} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" stroke="#07111f" strokeOpacity=".35" strokeWidth=".6" paintOrder="stroke">{item.name}</text>
            {showPins && item.pins.map((pin) => <circle key={pin.id} cx={pin.point.x} cy={pin.point.y} r={item.component.type === "breadboard" ? 1.6 : 2.1} fill={pin.name.toLowerCase().includes("gnd") ? "#64748b" : pin.name.toLowerCase().includes("5v") || pin.name.toLowerCase().includes("vin") ? "#ef4444" : "#e2e8f0"} stroke="#0f172a" strokeWidth=".65"><title>{item.name} · {pin.name}</title></circle>)}
          </g>
        })}
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0b1727]/85 px-3 py-2 text-[11px] text-slate-400 backdrop-blur-md sm:bottom-5 sm:left-5 sm:right-5 sm:px-4">
        <span><span className="font-semibold text-slate-200">{state.components.length}</span> components <span className="mx-1.5 text-slate-600">·</span> <span className="font-semibold text-slate-200">{state.wires.length}</span> connections</span>
        <span>Isometric preview · Select a component to inspect it in the properties panel</span>
      </div>
    </section>
  )
}
