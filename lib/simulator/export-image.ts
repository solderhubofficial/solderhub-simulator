/**
 * Export the circuit on the canvas as a standalone PNG or SVG file.
 *
 * The live canvas <svg> depends on page CSS (custom properties such as
 * var(--primary), inherited fonts) and on pan/zoom transforms, so none of it
 * can be saved as-is. We clone the artwork, frame it tightly around the
 * placed parts, resolve every CSS variable to a concrete colour and write a
 * self-contained document that renders identically anywhere.
 */

const SVG_NS = "http://www.w3.org/2000/svg"
const PADDING = 28
const EXPORT_BACKGROUND = "#ffffff"
const FONT_STACK = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const MAX_PNG_EDGE = 6000

export type ExportFormat = "png" | "svg"

export class EmptyCircuitError extends Error {
  constructor() {
    super("Nothing to export yet — add some components first.")
  }
}

interface BuiltSvg {
  markup: string
  width: number
  height: number
}

/** Replace var(--token) with the value it currently resolves to. */
function resolveCssVariables(markup: string): string {
  const style = getComputedStyle(document.documentElement)
  return markup.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (_, name: string) => {
    const value = style.getPropertyValue(name).trim()
    return value || "#2e7ef0"
  })
}

function buildStandaloneSvg(source: SVGSVGElement): BuiltSvg {
  const content = source.querySelector<SVGGElement>(":scope > g[transform]")
  const defs = source.querySelector("defs")
  if (!content || !defs || content.childElementCount === 0) throw new EmptyCircuitError()

  // getBBox is in the group's own (un-panned, un-zoomed) coordinates.
  const box = content.getBBox()
  if (box.width === 0 || box.height === 0) throw new EmptyCircuitError()

  const x = box.x - PADDING
  const y = box.y - PADDING
  const width = Math.ceil(box.width + PADDING * 2)
  const height = Math.ceil(box.height + PADDING * 2)

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`)
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))
  svg.setAttribute("font-family", FONT_STACK)

  svg.appendChild(defs.cloneNode(true))

  const background = document.createElementNS(SVG_NS, "rect")
  background.setAttribute("x", String(x))
  background.setAttribute("y", String(y))
  background.setAttribute("width", String(width))
  background.setAttribute("height", String(height))
  background.setAttribute("fill", EXPORT_BACKGROUND)
  svg.appendChild(background)

  // Re-parent the artwork without the viewport transform.
  const artwork = content.cloneNode(true) as SVGGElement
  artwork.removeAttribute("transform")
  artwork.removeAttribute("class")
  // Pin hit-areas are invisible interaction targets, not part of the picture.
  artwork.querySelectorAll("[data-pin-id]").forEach((el) => el.remove())
  svg.appendChild(artwork)

  const markup = new XMLSerializer().serializeToString(svg)
  return { markup: resolveCssVariables(markup), width, height }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function svgToPngBlob({ markup, width, height }: BuiltSvg): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Render at 2x for crisp text, capped so huge boards don't exhaust memory.
    const scale = Math.min(2, MAX_PNG_EDGE / Math.max(width, height))
    const img = new Image()
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("Canvas is not available in this browser."))
        return
      }
      ctx.fillStyle = EXPORT_BACKGROUND
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed."))), "image/png")
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Couldn't render the circuit to an image."))
    }
    img.src = url
  })
}

export async function exportCircuitImage(
  source: SVGSVGElement,
  format: ExportFormat,
  baseName = "solderhub-circuit",
): Promise<void> {
  const built = buildStandaloneSvg(source)
  if (format === "svg") {
    triggerDownload(new Blob([built.markup], { type: "image/svg+xml;charset=utf-8" }), `${baseName}.svg`)
    return
  }
  triggerDownload(await svgToPngBlob(built), `${baseName}.png`)
}
