/** Sketch handling for imported/saved projects (the `code` block of the solderhub-simulator-project format). */

const SOURCE_KEY = "solderhub-simulator:sketch-draft"
const MAX_IMPORTED_SOURCE_CHARS = 200_000

/** `data.code.source` when it is a sane string, else null. Pure; safe on untrusted JSON. */
export function extractProjectSource(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null
  const code = (data as { code?: unknown }).code
  if (typeof code !== "object" || code === null) return null
  const source = (code as { source?: unknown }).source
  return typeof source === "string" && source.length <= MAX_IMPORTED_SOURCE_CHARS ? source : null
}

/** Load the project's sketch into the editor (same channel the saved-project loader uses). */
export function applyProjectSource(data: unknown): boolean {
  const source = extractProjectSource(data)
  if (source === null) return false
  try { window.localStorage.setItem(SOURCE_KEY, source) } catch { /* local drafts are optional */ }
  window.dispatchEvent(new CustomEvent("solderhub:load-sketch", { detail: source }))
  return true
}
