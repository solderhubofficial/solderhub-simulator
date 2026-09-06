"use client"

import { createContext, useContext } from "react"

// Deliberately its own tiny module with zero other imports. Component
// renderers (reached via the registry -> definition -> renderer chain)
// need the current zoom level to size touch targets, but importing the
// full useSimulator hook from use-simulator-state.tsx there would create
// an import cycle: registry.ts -> definitions -> renderers -> this hook
// -> use-simulator-state.tsx -> registry.ts again. That cycle leaves some
// definitions undefined at module-eval time. Keeping this context
// separate (provided alongside the real simulator context, but importable
// on its own) breaks the cycle.
export const ViewportZoomContext = createContext(1)

export function useViewportZoom(): number {
  return useContext(ViewportZoomContext)
}
