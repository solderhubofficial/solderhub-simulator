"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type {
  CanvasState,
  ComponentPin,
  ComponentSimulationResult,
  PlacedComponent,
  SimulatorAction,
  Wire,
} from "@/types/simulator"
import { initialCanvasState, simulatorReducer } from "@/lib/simulator/reducer"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { instantiatePins } from "@/lib/simulator/utils/pins"
import { runSimulationTick } from "@/lib/simulator/engine/simulation-engine"
import { ViewportZoomContext } from "@/hooks/simulator/use-viewport-zoom"

interface SimulatorContextValue {
  state: typeof initialCanvasState
  dispatch: React.Dispatch<SimulatorAction>
  getPinsForComponent: (component: PlacedComponent) => ComponentPin[]
  pinCache: Map<string, ComponentPin[]>
  simulationResults: Record<string, ComponentSimulationResult>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null)

/** Snapshot of the parts of state that undo/redo cares about. */
type CanvasSnapshot = Pick<CanvasState, "components" | "wires">

/** Action types that represent a meaningful, undoable edit to the circuit. */
const HISTORY_ACTION_TYPES = new Set<SimulatorAction["type"]>([
  "ADD_COMPONENT",
  "REMOVE_COMPONENT",
  "MOVE_COMPONENT",
  "ROTATE_COMPONENT",
  "UPDATE_METADATA",
  "ADD_WIRE",
  "REMOVE_WIRE",
  "REWIRE_WIRE",
  "CLEAR_CANVAS",
  "LOAD_STATE",
])

const MAX_HISTORY = 60

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(simulatorReducer, initialCanvasState)
  const pinCacheRef = useRef(new Map<string, ComponentPin[]>())

  // Undo/redo history. Kept as component state (not refs) so canUndo/canRedo
  // stay reactive for toolbar buttons. Continuous gestures (dragging a
  // component) dispatch MOVE_COMPONENT on every pointer move -- those are
  // coalesced into a single history entry via lastActionRef so undo steps
  // back a whole drag at once, not one pixel at a time.
  const [past, setPast] = useState<CanvasSnapshot[]>([])
  const [future, setFuture] = useState<CanvasSnapshot[]>([])
  const lastActionRef = useRef<{ type: string; id?: string } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const dispatch = useCallback((action: SimulatorAction) => {
    if (HISTORY_ACTION_TYPES.has(action.type)) {
      const actionId = (action as { id?: string }).id
      const isCoalescedMove =
        action.type === "MOVE_COMPONENT" &&
        lastActionRef.current?.type === "MOVE_COMPONENT" &&
        lastActionRef.current.id === actionId

      if (!isCoalescedMove) {
        const snapshot = stateRef.current
        setPast((p) => {
          const next = [...p, { components: snapshot.components, wires: snapshot.wires }]
          return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
        })
        setFuture([])
      }
      lastActionRef.current = { type: action.type, id: actionId }
    } else {
      lastActionRef.current = null
    }
    rawDispatch(action)
  }, [])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const prev = p[p.length - 1]
      const snapshot = stateRef.current
      setFuture((f) => [...f, { components: snapshot.components, wires: snapshot.wires }])
      lastActionRef.current = null
      rawDispatch({ type: "LOAD_STATE", state: prev })
      return p.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[f.length - 1]
      const snapshot = stateRef.current
      setPast((p) => [...p, { components: snapshot.components, wires: snapshot.wires }])
      lastActionRef.current = null
      rawDispatch({ type: "LOAD_STATE", state: next })
      return f.slice(0, -1)
    })
  }, [])

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
      undo,
      redo,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    }),
    [state, getPinsForComponent, simulationResults, dispatch, undo, redo, past.length, future.length]
  )

  return (
    <SimulatorContext.Provider value={value}>
      <ViewportZoomContext.Provider value={state.viewport.zoom || 1}>
        {children}
      </ViewportZoomContext.Provider>
    </SimulatorContext.Provider>
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
