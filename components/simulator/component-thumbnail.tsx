"use client"

import { memo, useMemo } from "react"
import type { PlacedComponent } from "@/types/simulator"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"

const noop = () => {}

/**
 * Renders a small, non-interactive preview of a component using its real
 * canvas Renderer — the palette shows an actual scaled-down image of the
 * part instead of a generic icon.
 */
function ComponentThumbnailInner({ type }: { type: string }) {
  const def = getComponentDefinition(type)

  const previewComponent = useMemo<PlacedComponent | null>(() => {
    if (!def) return null
    return {
      id: `preview-${type}`,
      type,
      name: def.name,
      x: 0,
      y: 0,
      rotation: 0,
      metadata: { ...def.defaultMetadata },
    }
  }, [def, type])

  if (!def || !previewComponent) return null

  const pins = instantiatePins(previewComponent.id, def.pinTemplates)
  const pad = Math.max(def.width, def.height) * 0.18 + 6
  const viewBox = `${-pad} ${-pad} ${def.width + pad * 2} ${def.height + pad * 2}`
  const Renderer = def.Renderer

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      style={{ pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <Renderer
        component={previewComponent}
        pins={pins}
        selected={false}
        simulation={null}
        onPinClick={noop}
        onPinPointerDown={noop}
      />
    </svg>
  )
}

export const ComponentThumbnail = memo(ComponentThumbnailInner)
