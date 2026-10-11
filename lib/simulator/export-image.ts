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
  // Export the visible simulator viewport, not a tightly cropped circuit.
  // This preserves the grid, the current pan/zoom, component placement, and
  // wire routing exactly as presented in the canvas.
  const width = Math.max(1, Math.round(source.clientWidth || Number(source.getAttribute("width")) || 800))
  const height = Math.max(1, Math.round(source.clientHeight || Number(source.getAttribute("height")) || 600))
  const svg = source.cloneNode(true) as SVGSVGElement
  svg.setAttribute("xmlns", SVG_NS)
  svg.setAttribute("width", String(width))
  svg.setAttribute("height", String(height))
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`)
  svg.setAttribute("font-family", FONT_STACK)
  svg.style.overflow = "hidden"

  // A cloned SVG does not inherit the CSS background of its parent div.
  // Paint the same canvas background into the exported image.
  const background = document.createElementNS(SVG_NS, "rect")
  background.setAttribute("data-export-background", "true")
  background.setAttribute("x", "0")
  background.setAttribute("y", "0")
  background.setAttribute("width", String(width))
  background.setAttribute("height", String(height))
  background.setAttribute("fill", getComputedStyle(source.parentElement ?? document.documentElement).backgroundColor || EXPORT_BACKGROUND)
  svg.insertBefore(background, svg.firstChild)

  // Remove invisible interaction targets and temporary selection decorations;
  // keep the actual parts, grid, and wires visible in the viewport.
  svg.querySelectorAll("[data-pin-id]").forEach((el) => el.remove())
  svg.querySelectorAll("[data-export-background]").forEach((el, index) => {
    if (index > 0) el.remove()
  })

  // Automatically watermark every saved image; there is no opt-out because
  // exported simulator captures should retain clear source attribution.
  const watermark = document.createElementNS(SVG_NS, "g")
  watermark.setAttribute("aria-label", "Captured with simulator.solderhub.com")
  watermark.setAttribute("pointer-events", "none")

  const label = document.createElementNS(SVG_NS, "text")
  label.setAttribute("x", String(width - 14))
  label.setAttribute("y", String(height - 14))
  label.setAttribute("text-anchor", "end")
  label.setAttribute("font-size", "12")
  label.setAttribute("font-weight", "600")
  label.setAttribute("fill", "#0B1730")
  label.setAttribute("stroke", "#FFFFFF")
  label.setAttribute("stroke-width", "3")
  label.setAttribute("paint-order", "stroke")
  label.textContent = "Captured with simulator.solderhub.com"
  watermark.appendChild(label)
  svg.appendChild(watermark)

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
  includeBranding = true,
): Promise<void> {
  const built = buildStandaloneSvg(source, includeBranding)
  if (format === "svg") {
    triggerDownload(new Blob([built.markup], { type: "image/svg+xml;charset=utf-8" }), `${baseName}.svg`)
    return
  }
  triggerDownload(await svgToPngBlob(built), `${baseName}.png`)
}
