import { LANE_SPACING, STUB_LENGTH, type Point, type Rect } from "@/lib/simulator/utils/wire-routing"

/**
 * Wires are routed one at a time, so wires that leave or enter neighbouring pins
 * in the same direction (a pin header, the two sides of a sensor) all choose the
 * same row/column for their long run and end up drawn on top of each other. This
 * pass looks at every routed wire together and slides overlapping runs apart
 * into evenly spaced lanes, picking the lane order that needs the fewest
 * crossings.
 *
 * It only ever moves the *middle* segments of a wire. The first and last segment
 * stay attached to their pins, and a moved segment may shorten its neighbours
 * but never below the pin lead-out, so a wire never doubles back into its part.
 */

export interface LaneWire {
  id: string
  /** The wire's routed polyline, pin to pin. */
  points: Point[]
  /** False for wires with a user-chosen route: they are never moved, only avoided. */
  movable: boolean
}

/** One segment that was slid sideways. `axis` is the coordinate that changed. */
export interface LaneShift {
  axis: "x" | "y"
  from: number
  delta: number
}

export interface LaneResult {
  points: Point[]
  shifts: LaneShift[]
}

/** Runs closer together than this (px, centre to centre) are treated as overlapping. */
export const LANE_CLOSE = 4.5
/** A moved segment keeps at least this much of each neighbouring segment. */
const MIN_LEG = 8
const EPS = 0.01
const MAX_PASSES = 4
const MAX_PERMUTED = 6

type Axis = "x" | "y"

interface Run {
  wire: number
  seg: number
  /** Coordinate that stays constant along the run ("y" for a horizontal run). */
  axis: Axis
  coord: number
  lo: number
  hi: number
}

const other = (axis: Axis): Axis => (axis === "x" ? "y" : "x")
const get = (p: Point, axis: Axis) => (axis === "x" ? p.x : p.y)

function collectRuns(wires: { points: Point[] }[]): Run[] {
  const runs: Run[] = []
  wires.forEach((wire, w) => {
    const pts = wire.points
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      if (Math.abs(a.y - b.y) < EPS && Math.abs(a.x - b.x) >= 1) {
        runs.push({ wire: w, seg: i, axis: "y", coord: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) })
      } else if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) >= 1) {
        runs.push({ wire: w, seg: i, axis: "x", coord: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) })
      }
    }
  })
  return runs
}

function clusterRuns(runs: Run[]): Run[][] {
  const parent = runs.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i]
      const b = runs[j]
      if (a.axis !== b.axis || a.wire === b.wire) continue
      if (Math.abs(a.coord - b.coord) >= LANE_CLOSE) continue
      if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) <= 1) continue
      parent[find(i)] = find(j)
    }
  }
  const groups = new Map<number, Run[]>()
  runs.forEach((run, i) => {
    const root = find(i)
    const list = groups.get(root) ?? []
    list.push(run)
    groups.set(root, list)
  })
  return Array.from(groups.values()).filter((g) => new Set(g.map((r) => r.wire)).size >= 2)
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()]
  const out: T[][] = []
  items.forEach((item, i) => {
    const rest = items.slice(0, i).concat(items.slice(i + 1))
    for (const tail of permutations(rest)) out.push([item, ...tail])
  })
  return out
}

function hitsRect(axis: Axis, coord: number, lo: number, hi: number, r: Rect): boolean {
  if (axis === "y") return coord > r.top && coord < r.bottom && hi > r.left && lo < r.right
  return coord > r.left && coord < r.right && hi > r.top && lo < r.bottom
}

const contains = (r: Rect, p: Point) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom

/** Slides overlapping runs apart. Returns an entry for every wire, changed or not. */
export function spreadOverlappingRuns(wires: LaneWire[], obstacles: Rect[]): Map<string, LaneResult> {
  const work = wires.map((w) => ({ ...w, points: w.points.map((p) => ({ x: p.x, y: p.y })) }))
  const shifts: LaneShift[][] = work.map(() => [])

  // Parts the wire may legitimately sit inside (the ones its own pins belong to).
  const blockers = work.map((w) => {
    const first = w.points[0]
    const last = w.points[w.points.length - 1]
    return obstacles.filter((r) => !contains(r, first) && !contains(r, last))
  })

  const isShiftable = (run: Run) => work[run.wire].movable && run.seg >= 1 && run.seg <= work[run.wire].points.length - 3

  /** How far this run may slide (along its constant axis) without crushing a neighbour. */
  const slideRange = (run: Run): [number, number] => {
    const pts = work[run.wire].points
    const n = pts.length
    let lo = -Infinity
    let hi = Infinity
    const i = run.seg
    const v = get(pts[i], run.axis) - get(pts[i - 1], run.axis)
    const minPrev = Math.min(i - 1 === 0 ? STUB_LENGTH : MIN_LEG, Math.abs(v))
    if (v > EPS) lo = Math.max(lo, minPrev - v)
    else if (v < -EPS) hi = Math.min(hi, -minPrev - v)
    const w = get(pts[i + 2], run.axis) - get(pts[i + 1], run.axis)
    const minNext = Math.min(i + 1 === n - 2 ? STUB_LENGTH : MIN_LEG, Math.abs(w))
    if (w > EPS) hi = Math.min(hi, w - minNext)
    else if (w < -EPS) lo = Math.max(lo, w + minNext)
    return [lo, hi]
  }

  /** How many times the wires hanging off each run would cross another run in the group. */
  const crossings = (members: Run[], at: number[]): number => {
    let count = 0
    members.forEach((run, j) => {
      const pts = work[run.wire].points
      const along = other(run.axis)
      const arms: { pos: number; far: number }[] = []
      if (run.seg > 0) arms.push({ pos: get(pts[run.seg], along), far: get(pts[run.seg - 1], run.axis) })
      if (run.seg + 2 < pts.length) arms.push({ pos: get(pts[run.seg + 1], along), far: get(pts[run.seg + 2], run.axis) })
      for (const arm of arms) {
        const low = Math.min(at[j], arm.far) + 0.1
        const high = Math.max(at[j], arm.far) - 0.1
        members.forEach((target, k) => {
          if (k === j || target.wire === run.wire) return
          if (arm.pos > target.lo + 1 && arm.pos < target.hi - 1 && at[k] > low && at[k] < high) count += 1
        })
      }
    })
    return count
  }

  const processCluster = (members: Run[]) => {
    const movers = members.filter(isShiftable)
    if (movers.length === 0) return
    const fixed = members.filter((r) => !isShiftable(r))
    const ranges = movers.map(slideRange)

    const feasible = (m: number, target: number) => {
      const run = movers[m]
      const d = target - run.coord
      if (d < ranges[m][0] - EPS || d > ranges[m][1] + EPS) return false
      return !blockers[run.wire].some((r) => hitsRect(run.axis, target, run.lo, run.hi, r))
    }

    const best = (slots: number[]): { order: number[]; cost: number } | null => {
      // order[m] = slot index given to mover m
      const orders =
        movers.length <= MAX_PERMUTED
          ? permutations(slots.map((_, i) => i))
          : [slots.map((_, i) => i)]
      let result: { order: number[]; cost: number } | null = null
      for (const order of orders) {
        if (!order.every((slot, m) => feasible(m, slots[slot]))) continue
        const at = members.map((run) => {
          const m = movers.indexOf(run)
          return m >= 0 ? slots[order[m]] : run.coord
        })
        let cost = crossings(members, at) * 1000
        order.forEach((slot, m) => (cost += Math.abs(slots[slot] - movers[m].coord)))
        if (!result || cost < result.cost) result = { order, cost }
      }
      return result
    }

    const count = movers.length
    const attempts: number[][] = []
    if (fixed.length === 0) {
      const centre = members.reduce((sum, r) => sum + r.coord, 0) / members.length
      for (let step = 0; step <= 2 * (count + 1); step++) {
        const g = Math.ceil(step / 2) * (LANE_SPACING / 2) * (step % 2 === 1 ? 1 : -1)
        attempts.push(movers.map((_, t) => centre + g + (t - (count - 1) / 2) * LANE_SPACING))
      }
    } else {
      const top = Math.max(...fixed.map((r) => r.coord))
      const bottom = Math.min(...fixed.map((r) => r.coord))
      attempts.push(movers.map((_, t) => top + (t + 1) * LANE_SPACING))
      attempts.push(movers.map((_, t) => bottom - (t + 1) * LANE_SPACING))
    }

    let chosen: { slots: number[]; order: number[]; cost: number } | null = null
    for (const slots of attempts) {
      const found = best(slots)
      if (!found) continue
      if (fixed.length === 0) {
        chosen = { slots, ...found }
        break
      }
      if (!chosen || found.cost < chosen.cost) chosen = { slots, ...found }
    }
    if (!chosen) return

    // Apply from the highest segment index down so earlier points stay valid; shifts on
    // different axes never touch the same coordinate, so the order is otherwise free.
    movers.forEach((run, m) => {
      const target = chosen!.slots[chosen!.order[m]]
      const delta = target - run.coord
      if (Math.abs(delta) < EPS) return
      const pts = work[run.wire].points
      if (run.axis === "y") {
        pts[run.seg].y += delta
        pts[run.seg + 1].y += delta
      } else {
        pts[run.seg].x += delta
        pts[run.seg + 1].x += delta
      }
      shifts[run.wire].push({ axis: run.axis, from: run.coord, delta })
    })
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const clusters = clusterRuns(collectRuns(work))
    if (clusters.length === 0) break
    let moved = false
    for (const cluster of clusters) {
      // Earlier clusters may already have moved segments of these wires; re-read the runs.
      const fresh = collectRuns(work).filter((r) =>
        cluster.some((c) => c.wire === r.wire && c.seg === r.seg && c.axis === r.axis)
      )
      if (fresh.length < 2) continue
      const before = shifts.reduce((s, list) => s + list.length, 0)
      processCluster(fresh)
      if (shifts.reduce((s, list) => s + list.length, 0) > before) moved = true
    }
    if (!moved) break
  }

  const out = new Map<string, LaneResult>()
  work.forEach((w, i) => out.set(w.id, { points: w.points, shifts: shifts[i] }))
  return out
}
