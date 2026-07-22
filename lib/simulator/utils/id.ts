let counter = 0

/** Generate a unique ID with optional prefix */
export function generateId(prefix = "sim"): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}
