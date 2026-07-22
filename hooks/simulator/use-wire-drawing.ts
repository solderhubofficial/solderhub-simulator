"use client"

import { useCallback } from "react"
import { generateId } from "@/lib/simulator/utils/id"
import { canConnectPins } from "@/lib/simulator/engine/simulation-engine"
import { getComponentDefinition } from "@/lib/simulator/registry"
import { getPinWorldPosition } from "@/lib/simulator/utils/geometry"
import { useSimulator } from "@/hooks/simulator/use-simulator-state"

export function useWireDrawing() {
  const { state, dispatch, getPinsForComponent } = useSimulator()

  const startWire = useCallback(
    (componentId: string, pinId: string) => {
      const component = state.components.find((c) => c.id === componentId)
      if (!component) return
      const pins = getPinsForComponent(component)
      const pin = pins.find((p) => p.id === pinId)
      if (!pin) return
      const pos = getPinWorldPosition(component, pin)
      dispatch({
        type: "START_WIRE",
        fromComponentId: componentId,
        fromPinId: pinId,
        cursorX: pos.x,
        cursorY: pos.y,
      })
    },
    [state.components, dispatch, getPinsForComponent]
  )

  const completeWire = useCallback(
    (toComponentId: string, toPinId: string) => {
      if (!state.wireDraft) return false

      const fromComponent = state.components.find(
        (c) => c.id === state.wireDraft!.fromComponentId
      )
      const toComponent = state.components.find((c) => c.id === toComponentId)
      if (!fromComponent || !toComponent) return false

      const fromDef = getComponentDefinition(fromComponent.type)
      const toDef = getComponentDefinition(toComponent.type)
      if (!fromDef || !toDef) return false

      const fromPins = getPinsForComponent(fromComponent)
      const toPins = getPinsForComponent(toComponent)
      const fromPin = fromPins.find((p) => p.id === state.wireDraft!.fromPinId)
      const toPin = toPins.find((p) => p.id === toPinId)
      if (!fromPin || !toPin) return false

      const valid = canConnectPins(
        fromDef,
        fromPin,
        toDef,
        toPin,
        state.wires,
        fromComponent.id,
        toComponent.id
      )
      if (!valid) return false

      dispatch({
        type: "ADD_WIRE",
        wire: {
          id: generateId("wire"),
          fromComponentId: fromComponent.id,
          fromPinId: fromPin.id,
          toComponentId: toComponent.id,
          toPinId: toPin.id,
        },
      })
      return true
    },
    [state.wireDraft, state.components, state.wires, dispatch, getPinsForComponent]
  )

  const cancelWire = useCallback(() => {
    dispatch({ type: "CANCEL_WIRE" })
  }, [dispatch])

  const startRewire = useCallback(
    (wireId: string, endpoint: "from" | "to", componentId: string, pinId: string) => {
      const component = state.components.find((item) => item.id === componentId)
      if (!component) return
      const pins = getPinsForComponent(component)
      const pin = pins.find((candidate) => candidate.id === pinId)
      if (!pin) return
      const position = getPinWorldPosition(component, pin)
      dispatch({
        type: "START_REWIRE",
        wireId,
        endpoint,
        cursorX: position.x,
        cursorY: position.y,
      })
    },
    [state.components, dispatch, getPinsForComponent]
  )

  const completeRewire = useCallback(
    (componentId: string, pinId: string) => {
      if (!state.rewireDraft) return false

      const wire = state.wires.find((item) => item.id === state.rewireDraft!.wireId)
      if (!wire) return false

      const newComponent = state.components.find((item) => item.id === componentId)
      if (!newComponent) return false

      const newPins = getPinsForComponent(newComponent)
      const newPin = newPins.find((candidate) => candidate.id === pinId)
      if (!newPin) return false

      const preserved = state.rewireDraft.endpoint === "from"
        ? { componentId: wire.toComponentId, pinId: wire.toPinId }
        : { componentId: wire.fromComponentId, pinId: wire.fromPinId }

      const preservedComponent = state.components.find((item) => item.id === preserved.componentId)
      if (!preservedComponent) return false

      const preservedPins = getPinsForComponent(preservedComponent)
      const preservedPin = preservedPins.find((candidate) => candidate.id === preserved.pinId)
      if (!preservedPin) return false

      const preservedDef = getComponentDefinition(preservedComponent.type)
      const newDef = getComponentDefinition(newComponent.type)
      if (!preservedDef || !newDef) return false

      const valid = canConnectPins(
        preservedDef,
        preservedPin,
        newDef,
        newPin,
        state.wires.filter((item) => item.id !== wire.id),
        preservedComponent.id,
        newComponent.id
      )
      if (!valid) return false

      dispatch({
        type: "REWIRE_WIRE",
        wireId: wire.id,
        endpoint: state.rewireDraft.endpoint,
        componentId,
        pinId,
      })
      return true
    },
    [state.rewireDraft, state.components, state.wires, dispatch, getPinsForComponent]
  )

  const cancelRewire = useCallback(() => {
    dispatch({ type: "CANCEL_REWIRE" })
  }, [dispatch])

  const updateWireDraft = useCallback(
    (cursorX: number, cursorY: number) => {
      dispatch({ type: "UPDATE_WIRE_DRAFT", cursorX, cursorY })
    },
    [dispatch]
  )

  const updateRewireDraft = useCallback(
    (cursorX: number, cursorY: number) => {
      dispatch({ type: "UPDATE_REWIRE", cursorX, cursorY })
    },
    [dispatch]
  )

  const deleteWire = useCallback(
    (wireId: string) => {
      dispatch({ type: "REMOVE_WIRE", id: wireId })
    },
    [dispatch]
  )

  const handlePinClick = useCallback(
    (componentId: string, pinId: string) => {
      if (state.rewireDraft) {
        const success = completeRewire(componentId, pinId)
        if (!success) cancelRewire()
        return
      }

      if (state.wireDraft) {
        const success = completeWire(componentId, pinId)
        if (!success) cancelWire()
      } else {
        startWire(componentId, pinId)
      }
    },
    [state.rewireDraft, state.wireDraft, completeRewire, cancelRewire, completeWire, cancelWire, startWire]
  )

  return {
    wireDraft: state.wireDraft,
    rewireDraft: state.rewireDraft,
    startWire,
    completeWire,
    cancelWire,
    startRewire,
    completeRewire,
    cancelRewire,
    updateWireDraft,
    updateRewireDraft,
    deleteWire,
    handlePinClick,
  }
}
