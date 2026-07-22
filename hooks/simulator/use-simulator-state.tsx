"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react"
import type {
  ComponentPin,
  ComponentSimulationResult,
  PlacedComponent,
  Wire,
} from "@/types/simulator"
import { initialCanvasState, simulatorReducer } from "@/lib/simulator/reducer"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"

interface SimulatorContextValue {
  state: typeof initialCanvasState
  dispatch: React.Dispatch<import("@/types/simulator").SimulatorAction>
  getPinsForComponent: (component: PlacedComponent) => ComponentPin[]
  pinCache: Map<string, ComponentPin[]>
  simulationResults: Record<string, ComponentSimulationResult>
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null)

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulatorReducer, initialCanvasState)
  const pinCacheRef = useRef(new Map<string, ComponentPin[]>())

  const getPinsForComponent = useCallback((component: PlacedComponent): ComponentPin[] => {
    const cached = pinCacheRef.current.get(component.id)
    if (cached) return cached

    const def = getComponentDefinition(component.type)
    if (!def) return []
    const pins = instantiatePins(component.id, def.pinTemplates)
    pinCacheRef.current.set(component.id, pins)
    return pins
  }, [])

  // Invalidate removed components from pin cache
  const activeIds = useMemo(
    () => new Set(state.components.map((c) => c.id)),
    [state.components]
  )
  useEffect(() => {
    for (const id of pinCacheRef.current.keys()) {
      if (!activeIds.has(id)) pinCacheRef.current.delete(id)
    }
  }, [activeIds])

  const simulationResults = useMemo(
    () =>
      runSimulationTick(
        state.components,
        state.wires,
        getComponentDefinition,
        getPinsForComponent,
        state.isRunning
      ),
    [state.components, state.wires, state.isRunning, getPinsForComponent]
  )

  const value = useMemo<SimulatorContextValue>(
    () => ({
      state,
      dispatch,
      getPinsForComponent,
      pinCache: pinCacheRef.current,
      simulationResults,
    }),
    [state, getPinsForComponent, simulationResults]
  )

  return (
    <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>
  )
}

export function useSimulator(): SimulatorContextValue {
  const ctx = useContext(SimulatorContext)
  if (!ctx) throw new Error("useSimulator must be used within SimulatorProvider")
  return ctx
}

export function useSelectedComponent(): PlacedComponent | null {
  const { state } = useSimulator()
  return state.components.find((c) => c.id === state.selectedComponentId) ?? null
}

export function useSelectedWire(): Wire | null {
  const { state } = useSimulator()
  return state.wires.find((w) => w.id === state.selectedWireId) ?? null
}
