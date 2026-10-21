import type { ComponentType } from "react"

/** Pin electrical classification */
export type PinType = "digital" | "analog" | "power" | "ground" | "passive"

/** Logical pin state during simulation */
export type PinState = "HIGH" | "LOW" | "FLOATING" | "PWM"

/** Voltage level on a pin (volts). null = floating / undriven */
export type PinVoltage = number | null

/** A pin on a placed component instance */
export interface ComponentPin {
  id: string
  name: string
  type: PinType
  /** X offset from component origin (pre-rotation) */
  x: number
  /** Y offset from component origin (pre-rotation) */
  y: number
}

/** Placed component instance on the canvas */
export interface PlacedComponent {
  id: string
  type: string
  name: string
  x: number
  y: number
  rotation: 0 | 90 | 180 | 270
  metadata: Record<string, unknown>
}

/** How a wire's path is laid out between its two pins. "custom" follows user-placed bend points. */
export type WireRouteStyle = "auto" | "hvh" | "vhv" | "straight" | "custom"

/** How bend points snap while drawing/dragging: right angles only, 45° steps, or any angle. */
export type WireAngleMode = "90" | "45" | "free"

/** A point in canvas (world) coordinates. */
export interface WorldPoint {
  x: number
  y: number
}

/** User routing choice for one wire. All fields are optional in saved files. */
export interface WireRoute {
  /** "auto" picks the cleanest orthogonal path; "hvh"/"vhv" force the bend direction. */
  style: WireRouteStyle
  /** Pixels the middle segment is shifted from its default position. */
  offset?: number
  /** For style "custom": the bend points between the two pin lead-outs, in world coordinates. */
  points?: WorldPoint[]
}

/** Wire connecting two pins */
export interface Wire {
  id: string
  fromComponentId: string
  fromPinId: string
  toComponentId: string
  toPinId: string
  /** Custom wire color as "#rrggbb". Unset means the theme's default wire color. */
  color?: string
  /** Custom routing. Unset means automatic routing. */
  route?: WireRoute
}

/** Canvas viewport transform */
export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** Full simulator canvas state */
export interface CanvasState {
  components: PlacedComponent[]
  wires: Wire[]
  viewport: Viewport
  selectedComponentId: string | null
  selectedWireId: string | null
  wireDraft: WireDraft | null
  rewireDraft: WireRewireDraft | null
  isRunning: boolean
  /** Angle snapping used for wire bend points. */
  wireAngle: WireAngleMode
}

/** In-progress wire being drawn from a pin */
export interface WireDraft {
  fromComponentId: string
  fromPinId: string
  cursorX: number
  cursorY: number
  /** Bend points the user has already laid down with clicks, in order. */
  points: WorldPoint[]
  /** The pin the cursor is currently over (if any); the wire will finish there on click. */
  hover?: { componentId: string; pinId: string } | null
}

/** In-progress wire endpoint drag for rewiring */
export interface WireRewireDraft {
  wireId: string
  endpoint: "from" | "to"
  cursorX: number
  cursorY: number
}

/** Per-pin simulation result */
export interface PinSimulationResult {
  voltage: PinVoltage
  state: PinState
}

/** Simulation output for one component instance */
export interface ComponentSimulationResult {
  componentId: string
  pinStates: Record<string, PinSimulationResult>
  /** Visual/behavioral flags (e.g. led on, buzzer active) */
  flags: Record<string, boolean | number>
}

/** Full simulation snapshot */
export interface SimulationSnapshot {
  componentResults: Record<string, ComponentSimulationResult>
  isRunning: boolean
}

/** Props passed to every component SVG renderer */
export interface ComponentRendererProps {
  component: PlacedComponent
  pins: ComponentPin[]
  selected: boolean
  simulation: ComponentSimulationResult | null
  onPinClick: (pinId: string) => void
  onPinPointerDown: (pinId: string, e: React.PointerEvent) => void
}

/** React component type for rendering a simulator part */
export type ComponentRenderer = ComponentType<ComponentRendererProps>

/** Pin template before placement (no id) */
export interface PinTemplate {
  name: string
  type: PinType
  x: number
  y: number
}

/** Static definition registered for a component type */
export interface ComponentDefinition {
  type: string
  name: string
  category: "board" | "passive" | "active" | "input" | "output"
  width: number
  height: number
  pinTemplates: PinTemplate[]
  defaultMetadata: Record<string, unknown>
  /** Whether two pins of this type may connect */
  canConnectPins: (fromType: PinType, toType: PinType) => boolean
  /** Internal electrical connections (e.g. breadboard rows, button when pressed) */
  getInternalConnections: (
    component: PlacedComponent,
    pins: ComponentPin[]
  ) => [string, string][]
  simulate: (
    component: PlacedComponent,
    pins: ComponentPin[],
    pinVoltages: Record<string, PinVoltage>
  ) => ComponentSimulationResult
  Renderer: ComponentRenderer
}

/** Sidebar palette entry */
export interface ComponentPaletteItem {
  type: string
  name: string
  category: string
}

/** Simulator reducer actions */
export type SimulatorAction =
  | { type: "ADD_COMPONENT"; component: PlacedComponent }
  | { type: "REMOVE_COMPONENT"; id: string }
  | { type: "MOVE_COMPONENT"; id: string; x: number; y: number }
  | { type: "ROTATE_COMPONENT"; id: string; counterClockwise?: boolean }
  | {
      type: "UPDATE_METADATA"
      id: string
      metadata: Record<string, unknown>
      /** Machine-driven updates (firmware pin changes) are not user edits and must not enter undo history. */
      transient?: boolean
    }
  | { type: "SELECT_COMPONENT"; id: string | null }
  | { type: "SELECT_WIRE"; id: string | null }
  | { type: "ADD_WIRE"; wire: Wire }
  | {
      /** Splits a wire in two around a new junction part, optionally attaching another wire end to it. */
      type: "INSERT_JUNCTION"
      wireId: string
      junction: PlacedComponent
      wireA: Wire
      wireB: Wire
      connect?: { kind: "add"; wire: Wire } | { kind: "rewire"; wireId: string; endpoint: "from" | "to" }
    }
  | { type: "REMOVE_WIRE"; id: string }
  | { type: "START_WIRE"; fromComponentId: string; fromPinId: string; cursorX: number; cursorY: number }
  | { type: "UPDATE_WIRE_DRAFT"; cursorX: number; cursorY: number; hover?: { componentId: string; pinId: string } | null }
  | { type: "ADD_WIRE_WAYPOINT"; x: number; y: number }
  | { type: "POP_WIRE_WAYPOINT" }
  | { type: "SET_WIRE_ANGLE"; mode: WireAngleMode }
  | { type: "CANCEL_WIRE" }
  | { type: "START_REWIRE"; wireId: string; endpoint: "from" | "to"; cursorX: number; cursorY: number }
  | { type: "UPDATE_REWIRE"; cursorX: number; cursorY: number }
  | { type: "CANCEL_REWIRE" }
  | { type: "REWIRE_WIRE"; wireId: string; endpoint: "from" | "to"; componentId: string; pinId: string }
  | { type: "UPDATE_WIRE"; id: string; patch: { color?: string | null; route?: WireRoute | null } }
  | { type: "SET_VIEWPORT"; viewport: Partial<Viewport> }
  | { type: "SET_RUNNING"; isRunning: boolean }
  | { type: "CLEAR_CANVAS" }
  | { type: "LOAD_STATE"; state: Pick<CanvasState, "components" | "wires"> }
