import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateBreadboard } from "@/lib/simulator/engine/component-simulation"
import { BreadboardRenderer } from "@/components/simulator/components/breadboard/renderer"

const COLS = 30
const ROWS = 5
const HOLE_SPACING = 14
const START_X = 30
const START_Y_TOP = 40
const START_Y_BOTTOM = 120
const GAP = 60

function generatePinTemplates() {
  const pins: ComponentDefinition["pinTemplates"] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const name = `T${row}_${col}`
      pins.push({
        name,
        type: "passive",
        x: START_X + col * HOLE_SPACING,
        y: START_Y_TOP + row * HOLE_SPACING,
      })
    }
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const name = `B${row}_${col}`
      pins.push({
        name,
        type: "passive",
        x: START_X + col * HOLE_SPACING,
        y: START_Y_BOTTOM + GAP + row * HOLE_SPACING,
      })
    }
  }
  // Power rails
  for (let col = 0; col < COLS; col++) {
    pins.push({ name: `R+_${col}`, type: "passive", x: START_X + col * HOLE_SPACING, y: 10 })
    pins.push({ name: `R-_${col}`, type: "passive", x: START_X + col * HOLE_SPACING, y: 24 })
    pins.push({
      name: `RB+_${col}`,
      type: "passive",
      x: START_X + col * HOLE_SPACING,
      y: START_Y_BOTTOM + GAP + ROWS * HOLE_SPACING + 20,
    })
    pins.push({
      name: `RB-_${col}`,
      type: "passive",
      x: START_X + col * HOLE_SPACING,
      y: START_Y_BOTTOM + GAP + ROWS * HOLE_SPACING + 34,
    })
  }
  return pins
}

const pinTemplates = generatePinTemplates()

export const breadboardDefinition: ComponentDefinition = {
  type: "breadboard",
  name: "Breadboard",
  category: "passive",
  width: START_X + COLS * HOLE_SPACING + 20,
  height: START_Y_BOTTOM + GAP + ROWS * HOLE_SPACING + 60,
  pinTemplates,
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: (_component, pins) => {
    const connections: [string, string][] = []
    // Top section: each row connects horizontally
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const a = pins.find((p) => p.name === `T${row}_${col}`)
        const b = pins.find((p) => p.name === `T${row}_${col + 1}`)
        if (a && b) connections.push([a.id, b.id])
      }
    }
    // Bottom section: each row connects horizontally
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const a = pins.find((p) => p.name === `B${row}_${col}`)
        const b = pins.find((p) => p.name === `B${row}_${col + 1}`)
        if (a && b) connections.push([a.id, b.id])
      }
    }
    // Power rails
    for (let col = 0; col < COLS - 1; col++) {
      for (const prefix of ["R+", "R-", "RB+", "RB-"]) {
        const a = pins.find((p) => p.name === `${prefix}_${col}`)
        const b = pins.find((p) => p.name === `${prefix}_${col + 1}`)
        if (a && b) connections.push([a.id, b.id])
      }
    }
    return connections
  },
  simulate: simulateBreadboard,
  Renderer: BreadboardRenderer,
}
