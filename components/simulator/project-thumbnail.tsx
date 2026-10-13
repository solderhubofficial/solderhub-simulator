"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { Cpu } from "lucide-react"
import type { PlacedComponent } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { ComponentDefs } from "@/components/simulator/canvas/component-defs"
import { ComponentThumbnail } from "@/components/simulator/component-thumbnail"
import { FAMILY_THUMBNAIL_TYPE, familyOfType, type BoardFamily } from "@/lib/simulator/project-board"

const noop = () => {}

type RawComponent = Partial<PlacedComponent> & { type: string }
type RawWire = { fromComponentId?: string; fromPinId?: string; toComponentId?: string; toPinId?: string; color?: string }

function rotate(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) }
}

/** Small, static preview of a whole circuit using the real part renderers. */
function CircuitPreview({ components, wires }: { components: RawComponent[]; wires: RawWire[] }) {
  const scene = useMemo(() => {
    const parts = components.slice(0, 40).flatMap((raw, index) => {
      const def = getComponentDefinition(raw.type)
      if (!def || typeof raw.x !== "number" || typeof raw.y !== "number") return []
      const component: PlacedComponent = {
        id: raw.id ?? `p${index}`, type: raw.type, name: def.name, x: raw.x, y: raw.y,
        rotation: raw.rotation ?? 0, metadata: { ...def.defaultMetadata, ...(raw.metadata ?? {}) },
      }
      const pins = instantiatePins(component.id, def.pinTemplates)
      return [{ component, pins, def }]
    })
    if (parts.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const pinPos = new Map<string, { x: number; y: number }>()
    for (const { component, pins, def } of parts) {
      for (const [px, py] of [[0, 0], [def.width, 0], [0, def.height], [def.width, def.height]]) {
        const p = rotate(px, py, component.rotation)
        minX = Math.min(minX, component.x + p.x); maxX = Math.max(maxX, component.x + p.x)
        minY = Math.min(minY, component.y + p.y); maxY = Math.max(maxY, component.y + p.y)
      }
      for (const pin of pins) {
        const p = rotate(pin.x, pin.y, component.rotation)
        pinPos.set(pin.id, { x: component.x + p.x, y: component.y + p.y })
      }
    }
    const lines = wires.slice(0, 120).flatMap((w) => {
      const a = w.fromPinId ? pinPos.get(w.fromPinId) : undefined
      const b = w.toPinId ? pinPos.get(w.toPinId) : undefined
      return a && b ? [{ a, b, color: w.color ?? "#e0533d" }] : []
    })
    const pad = Math.max(maxX - minX, maxY - minY) * 0.06 + 8
    return { parts, lines, viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}` }
  }, [components, wires])

  if (!scene) return null
  return (
    <svg viewBox={scene.viewBox} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ pointerEvents: "none" }}>
      <ComponentDefs />
      {scene.parts.map(({ component, pins, def }) => {
        const Renderer = def.Renderer
        return (
          <g key={component.id} transform={`translate(${component.x}, ${component.y}) rotate(${component.rotation})`}>
            <Renderer component={component} pins={pins} selected={false} simulation={null} onPinClick={noop} onPinPointerDown={noop} />
          </g>
        )
      })}
      {scene.lines.map((l, i) => (
        <path key={i} d={`M${l.a.x} ${l.a.y} L${l.b.x} ${l.b.y}`} stroke={l.color} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.9} />
      ))}
    </svg>
  )
}

interface ProjectThumbnailProps {
  family: BoardFamily
  boardType: string | null
  imageUrl?: string | null
  components?: unknown
  wires?: unknown
}

/**
 * Renders lazily: nothing heavy mounts until the card scrolls into view,
 * which keeps a long public library fast.
 */
function ProjectThumbnailInner({ family, boardType, imageUrl, components, wires }: ProjectThumbnailProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: "200px" })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const hasCircuit = Array.isArray(components) && components.length > 0
  const fallbackType = boardType && getComponentDefinition(boardType) ? boardType : FAMILY_THUMBNAIL_TYPE[family]

  return (
    <div ref={ref} className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-canvas-bg p-2 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:14px_14px]">
      {!visible ? null : imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-contain" />
      ) : hasCircuit ? (
        <CircuitPreview components={components as RawComponent[]} wires={Array.isArray(wires) ? (wires as RawWire[]) : []} />
      ) : fallbackType ? (
        <div className="h-full w-full"><ComponentThumbnail type={fallbackType} /></div>
      ) : (
        <Cpu className="size-8 text-muted-foreground/40" />
      )}
    </div>
  )
}

export const ProjectThumbnail = memo(ProjectThumbnailInner)
export { familyOfType }
