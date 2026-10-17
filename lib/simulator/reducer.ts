import type { CanvasState, SimulatorAction } from "@/types/simulator"
import { DEFAULT_ZOOM } from "@/lib/simulator/constants"
import { normalizeWireColor, normalizeWireRoute } from "@/lib/simulator/wire-colors"
import { shiftWireBends } from "@/lib/simulator/utils/wire-waypoints"

export const initialCanvasState: CanvasState = {
  components: [],
  wires: [],
  viewport: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
  selectedComponentId: null,
  selectedWireId: null,
  wireDraft: null,
  rewireDraft: null,
  isRunning: false,
  wireAngle: "90",
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

    case "MOVE_COMPONENT": {
      const moving = state.components.find((c) => c.id === action.id)
      if (!moving) return state
      const dx = action.x - moving.x
      const dy = action.y - moving.y
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.id ? { ...c, x: action.x, y: action.y } : c
        ),
        // Bend points follow the part they're attached to so wires stretch instead of tearing.
        wires: dx === 0 && dy === 0 ? state.wires : state.wires.map((w) => shiftWireBends(w, action.id, dx, dy)),
      }
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
          points: [],
          hover: null,
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
              hover: action.hover ?? null,
            },
          }
        : state

    case "ADD_WIRE_WAYPOINT":
      return state.wireDraft
        ? { ...state, wireDraft: { ...state.wireDraft, points: [...state.wireDraft.points, { x: action.x, y: action.y }] } }
        : state

    case "POP_WIRE_WAYPOINT":
      return state.wireDraft && state.wireDraft.points.length > 0
        ? { ...state, wireDraft: { ...state.wireDraft, points: state.wireDraft.points.slice(0, -1) } }
        : state

    case "SET_WIRE_ANGLE":
      return { ...state, wireAngle: action.mode }

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

    case "UPDATE_WIRE":
      return {
        ...state,
        wires: state.wires.map((wire) => {
          if (wire.id !== action.id) return wire
          const next = { ...wire }
          if ("color" in action.patch) {
            const color = normalizeWireColor(action.patch.color)
            if (color) next.color = color
            else delete next.color
          }
          if ("route" in action.patch) {
            const route = normalizeWireRoute(action.patch.route)
            if (route) next.route = route
            else delete next.route
          }
          return next
        }),
      }

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
        wireAngle: state.wireAngle,
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
