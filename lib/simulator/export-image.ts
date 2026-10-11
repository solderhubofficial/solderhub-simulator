/**
 * Export the visible simulator canvas as a standalone PNG or SVG file.
 * The export preserves the viewport framing, grid, component positions,
 * wires, and pan/zoom while inlining visual styles for standalone use.
 */

const SVG_NS = "http://www.w3.org/2000/svg"
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

  // Inline computed styles from the live SVG before serializing. Standalone SVG
  // files do not have the app stylesheet, so materialize key visual properties.
  const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))]
  const clonedNodes = [svg, ...Array.from(svg.querySelectorAll("*"))]
  sourceNodes.forEach((original, index) => {
    const clone = clonedNodes[index]
    if (!clone) return
    const computed = getComputedStyle(original)
    const style = new Map<string, string>()
    ;(clone.getAttribute("style") ?? "").split(";").forEach((declaration) => {
      const split = declaration.indexOf(":")
      if (split > 0) style.set(declaration.slice(0, split).trim(), declaration.slice(split + 1).trim())
    })
    [
      "fill", "fill-opacity", "fill-rule", "stroke", "stroke-width",
      "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
      "opacity", "color", "font-family", "font-size", "font-weight",
      "text-anchor", "paint-order", "visibility", "display", "filter",
      "clip-path", "mask",
    ].forEach((property) => {
      const value = computed.getPropertyValue(property)
      if (value && value !== "none" && value !== "normal") style.set(property, value)
    })
    clone.setAttribute("style", Array.from(style, ([key, value]) => key + ": " + value).join("; "))
  })
  // A cloned SVG does not inherit the CSS background of its parent div.
  // Paint the same canvas background into the exported image.
  const background = document.createElementNS(SVG_NS, "rect")
  background.setAttribute("data-export-background", "true")
  background.setAttribute("x", "0")
  background.setAttribute("y", "0")
  background.setAttribute("width", String(width))
  background.setAttribute("height", String(height))
  const canvasBackground = getComputedStyle(source.parentElement ?? document.documentElement).backgroundColor
  background.setAttribute("fill", !canvasBackground || canvasBackground === "rgba(0, 0, 0, 0)" ? EXPORT_BACKGROUND : canvasBackground)
  svg.insertBefore(background, svg.firstChild)

  // Remove invisible interaction targets and temporary selection decorations;
  // keep the actual parts, grid, and wires visible in the viewport.
  svg.querySelectorAll("[data-pin-id]").forEach((el) => el.remove())
  svg.querySelectorAll("[data-export-background]").forEach((el, index) => {
    if (index > 0) el.remove()
  })

  // Compact SolderHub brand plate, legible on light and dark circuit captures.
  const watermark = document.createElementNS(SVG_NS, "g")
  watermark.setAttribute("aria-label", "Built with SolderHub — simulator.solderhub.com")
  watermark.setAttribute("pointer-events", "none")

  const plate = document.createElementNS(SVG_NS, "rect")
  const plateWidth = Math.min(204, Math.max(120, width - 16))
  const plateHeight = 28
  const plateX = Math.max(8, width - plateWidth - 12)
  const plateY = Math.max(8, height - plateHeight - 12)
  plate.setAttribute("x", String(plateX))
  plate.setAttribute("y", String(plateY))
  plate.setAttribute("width", String(plateWidth))
  plate.setAttribute("height", String(Math.min(plateHeight, Math.max(1, height - 16))))
  plate.setAttribute("rx", "8")
  plate.setAttribute("fill", "#07172D")
  plate.setAttribute("fill-opacity", "0.94")
  plate.setAttribute("stroke", "#FFFFFF")
  plate.setAttribute("stroke-opacity", "0.22")
  plate.setAttribute("stroke-width", "1")

  const label = document.createElementNS(SVG_NS, "text")
  label.setAttribute("x", String(width - 22))
  label.setAttribute("y", String(height - 22))
  label.setAttribute("text-anchor", "end")
  label.setAttribute("font-family", FONT_STACK)
  label.setAttribute("font-size", "11")
  label.setAttribute("font-weight", "700")
  const built = document.createElementNS(SVG_NS, "tspan")
  built.setAttribute("fill", "#FFFFFF")
  built.textContent = "Built with "
  const solder = document.createElementNS(SVG_NS, "tspan")
  solder.setAttribute("fill", "#7DBBFF")
  solder.textContent = "Solder"
  const hub = document.createElementNS(SVG_NS, "tspan")
  hub.setAttribute("fill", "#FF8A24")
  hub.textContent = "Hub"
  label.append(built, solder, hub)
  watermark.append(plate, label)
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
): Promise<void> {
  const built = buildStandaloneSvg(source)
  if (format === "svg") {
    triggerDownload(new Blob([built.markup], { type: "image/svg+xml;charset=utf-8" }), `${baseName}.svg`)
    return
  }
  triggerDownload(await svgToPngBlob(built), `${baseName}.png`)
}
