import type { CanvasState, SimulatorAction } from "@/types/simulator"
import { DEFAULT_ZOOM } from "@/lib/simulator/constants"

export const initialCanvasState: CanvasState = {
  components: [],
  wires: [],
  viewport: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
  selectedComponentId: null,
  selectedWireId: null,
  wireDraft: null,
  rewireDraft: null,
  isRunning: false,
}

export function simulatorReducer(state: CanvasState, action: SimulatorAction): CanvasState {
  switch (action.type) {
    case "ADD_COMPONENT":
      return {
        ...state,
        components: [...state.components, action.component],
        selectedComponentId: action.component.id,
        selectedWireId: null,
      }

    case "REMOVE_COMPONENT":
      return {
        ...state,
        components: state.components.filter((c) => c.id !== action.id),
        wires: state.wires.filter(
          (w) => w.fromComponentId !== action.id && w.toComponentId !== action.id
        ),
        selectedComponentId:
          state.selectedComponentId === action.id ? null : state.selectedComponentId,
      }

    case "MOVE_COMPONENT":
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, x: action.x, y: action.y } : c
        ),
      }

    case "ROTATE_COMPONENT":
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id
            ? { ...c, rotation: ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270 }
            : c
        ),
      }

    case "UPDATE_METADATA":
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id
            ? { ...c, metadata: { ...c.metadata, ...action.metadata } }
            : c
        ),
      }

    case "SELECT_COMPONENT":
      return {
        ...state,
        selectedComponentId: action.id,
        selectedWireId: null,
      }

    case "SELECT_WIRE":
      return {
        ...state,
        selectedWireId: action.id,
        selectedComponentId: null,
      }

    case "ADD_WIRE":
      return {
        ...state,
        wires: [...state.wires, action.wire],
        wireDraft: null,
        selectedWireId: action.wire.id,
        selectedComponentId: null,
      }

    case "REMOVE_WIRE":
      return {
        ...state,
        wires: state.wires.filter((w) => w.id !== action.id),
        selectedWireId:
          state.selectedWireId === action.id ? null : state.selectedWireId,
      }

    case "START_WIRE":
      return {
        ...state,
        wireDraft: {
          fromComponentId: action.fromComponentId,
          fromPinId: action.fromPinId,
          cursorX: action.cursorX,
          cursorY: action.cursorY,
        },
      }

    case "UPDATE_WIRE_DRAFT":
      return state.wireDraft
        ? {
            ...state,
            wireDraft: {
              ...state.wireDraft,
              cursorX: action.cursorX,
              cursorY: action.cursorY,
            },
          }
        : state

    case "CANCEL_WIRE":
      return { ...state, wireDraft: null }

    case "START_REWIRE":
      return {
        ...state,
        rewireDraft: {
          wireId: action.wireId,
          endpoint: action.endpoint,
          cursorX: action.cursorX,
          cursorY: action.cursorY,
        },
      }

    case "UPDATE_REWIRE":
      return state.rewireDraft
        ? {
            ...state,
            rewireDraft: {
              ...state.rewireDraft,
              cursorX: action.cursorX,
              cursorY: action.cursorY,
            },
          }
        : state

    case "CANCEL_REWIRE":
      return { ...state, rewireDraft: null }

    case "REWIRE_WIRE":
      return {
        ...state,
        wires: state.wires.map((wire) =>
          wire.id === action.wireId
            ? action.endpoint === "from"
              ? {
                  ...wire,
                  fromComponentId: action.componentId,
                  fromPinId: action.pinId,
                }
              : {
                  ...wire,
                  toComponentId: action.componentId,
                  toPinId: action.pinId,
                }
            : wire
        ),
        selectedWireId: action.wireId,
        rewireDraft: null,
      }

    case "SET_VIEWPORT":
      return {
        ...state,
        viewport: { ...state.viewport, ...action.viewport },
      }

    case "SET_RUNNING":
      return { ...state, isRunning: action.isRunning }

    case "CLEAR_CANVAS":
      return {
        ...initialCanvasState,
        viewport: state.viewport,
      }

    case "LOAD_STATE":
      return {
        ...state,
        components: action.state.components,
        wires: action.state.wires,
        selectedComponentId: null,
        selectedWireId: null,
        wireDraft: null,
        rewireDraft: null,
        isRunning: false,
      }

    default:
      return state
  }
}
