"use client"

import { Fragment, memo } from "react"
import { LED_COLORS } from "@/lib/simulator/led-colors"

// LCD 1602 character-cell geometry. The dot-matrix patterns below tile one
// character cell (5 x 8 dots) so the renderer can paint a whole screen with
// two <rect>s. Exported so the renderer and the patterns can never disagree.
export const LCD_CELL_W = 14.25
export const LCD_CELL_H = 26
export const LCD_DOT_W = 2
export const LCD_DOT_H = 2.4
export const LCD_DOT_PITCH_X = 2.4
export const LCD_DOT_PITCH_Y = 2.9
export const LCD_DOT_X0 = (LCD_CELL_W - (4 * LCD_DOT_PITCH_X + LCD_DOT_W)) / 2
export const LCD_DOT_Y0 = (LCD_CELL_H - (7 * LCD_DOT_PITCH_Y + LCD_DOT_H)) / 2

const LCD_DOTS = Array.from({ length: 8 }, (_, row) =>
  Array.from({ length: 5 }, (_, col) => ({
    key: `${row}-${col}`,
    x: LCD_DOT_X0 + col * LCD_DOT_PITCH_X,
    y: LCD_DOT_Y0 + row * LCD_DOT_PITCH_Y,
  }))
).flat()

/**
 * Shared gradients/filters referenced by component renderers via url(#id).
 * Rendered once inside the canvas <svg> so ids stay unique regardless of
 * how many component instances are on the board.
 */
function ComponentDefsInner() {
  return (
    <defs>
      {/* ---------- PCB substrates ---------- */}
      <linearGradient id="sim-pcb-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1687bd" />
        <stop offset="55%" stopColor="#0e6690" />
        <stop offset="100%" stopColor="#083c56" />
      </linearGradient>
      <linearGradient id="sim-pcb-dark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#383b4f" />
        <stop offset="55%" stopColor="#282a36" />
        <stop offset="100%" stopColor="#17181f" />
      </linearGradient>
      <linearGradient id="sim-pcb-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc5c5c" />
        <stop offset="55%" stopColor="#c23b3b" />
        <stop offset="100%" stopColor="#8a2323" />
      </linearGradient>
      <linearGradient id="sim-pcb-green" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#23995a" />
        <stop offset="55%" stopColor="#167545" />
        <stop offset="100%" stopColor="#0c4a2b" />
      </linearGradient>
      {/* RC522 blue solder mask: bright upper-left, deep navy lower-right. */}
      <linearGradient id="sim-pcb-rc522" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1a74c9" />
        <stop offset="50%" stopColor="#0f5aa8" />
        <stop offset="100%" stopColor="#09407c" />
      </linearGradient>
      {/* OLED module: silver glass frame, screen reflection and blue-white glow. */}
      <linearGradient id="sim-oled-bezel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f6f8fa" />
        <stop offset="45%" stopColor="#d3d9e0" />
        <stop offset="100%" stopColor="#a5aeb9" />
      </linearGradient>
      <linearGradient id="sim-oled-glass" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
        <stop offset="38%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="39%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="sim-oled-glow" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stopColor="#1d4f86" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#0a1c33" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sim-pcb-royal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2f6fd0" />
        <stop offset="55%" stopColor="#2255b0" />
        <stop offset="100%" stopColor="#173c80" />
      </linearGradient>

      {/* ---------- Misc surfaces ---------- */}
      <linearGradient id="sim-board-cream" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fcfcf8" />
        <stop offset="100%" stopColor="#e6e6de" />
      </linearGradient>
      <linearGradient id="sim-metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e4e4e4" />
        <stop offset="50%" stopColor="#a3a3a3" />
        <stop offset="100%" stopColor="#767676" />
      </linearGradient>
      {/* Brushed stainless: bright top, soft dark band, bright rebound. */}
      <linearGradient id="sim-steel" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f6f7f8" />
        <stop offset="28%" stopColor="#cdd0d4" />
        <stop offset="58%" stopColor="#9da1a6" />
        <stop offset="82%" stopColor="#d3d6da" />
        <stop offset="100%" stopColor="#8a8e94" />
      </linearGradient>
      <linearGradient id="sim-brass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f7e3a0" />
        <stop offset="35%" stopColor="#d9b64e" />
        <stop offset="70%" stopColor="#a67f23" />
        <stop offset="100%" stopColor="#c9a443" />
      </linearGradient>
      <linearGradient id="sim-copper" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f0b98a" />
        <stop offset="45%" stopColor="#c97b3a" />
        <stop offset="100%" stopColor="#8a4a1e" />
      </linearGradient>
      <linearGradient id="sim-plastic-dark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#40444c" />
        <stop offset="45%" stopColor="#1f2227" />
        <stop offset="100%" stopColor="#0e0f12" />
      </linearGradient>
      <linearGradient id="sim-plastic-dark-h" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3a3e46" />
        <stop offset="40%" stopColor="#1c1e23" />
        <stop offset="100%" stopColor="#0b0c0e" />
      </linearGradient>
      <radialGradient id="sim-plastic-dome" cx="38%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#4a4e57" />
        <stop offset="55%" stopColor="#1b1d22" />
        <stop offset="100%" stopColor="#08090a" />
      </radialGradient>

      {/* ---------- Leads / header pins ----------
          lead-v is shaded left->right (for vertical strips), lead-h top->bottom
          (for horizontal strips). Used via <LeadV>/<LeadH> rects. */}
      <linearGradient id="sim-lead-v" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7d8186" />
        <stop offset="40%" stopColor="#f2f3f4" />
        <stop offset="100%" stopColor="#8d9196" />
      </linearGradient>
      <linearGradient id="sim-lead-h" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f2f3f4" />
        <stop offset="55%" stopColor="#a6aaaf" />
        <stop offset="100%" stopColor="#74787d" />
      </linearGradient>
      <linearGradient id="sim-gold-v" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a8821f" />
        <stop offset="40%" stopColor="#f6dc8a" />
        <stop offset="100%" stopColor="#b8932d" />
      </linearGradient>
      <linearGradient id="sim-gold-h" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f6dc8a" />
        <stop offset="55%" stopColor="#c9a443" />
        <stop offset="100%" stopColor="#97751a" />
      </linearGradient>

      {/* ---------- Cylinder shading overlays ----------
          Translucent white->clear->black washes laid over a flat-coloured
          body so one overlay can make any colour read as a rounded rod. */}
      <linearGradient id="sim-cyl-shade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="22%" stopColor="#ffffff" stopOpacity="0.14" />
        <stop offset="50%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.34" />
      </linearGradient>
      <linearGradient id="sim-cyl-shade-v" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.38" />
        <stop offset="26%" stopColor="#ffffff" stopOpacity="0.4" />
        <stop offset="48%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
      </linearGradient>
      <linearGradient id="sim-cylinder-tan" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f3dcb0" />
        <stop offset="18%" stopColor="#e0c090" />
        <stop offset="55%" stopColor="#cba873" />
        <stop offset="100%" stopColor="#a87f4a" />
      </linearGradient>
      <linearGradient id="sim-cylinder-metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f2f2f2" />
        <stop offset="20%" stopColor="#d4d4d4" />
        <stop offset="55%" stopColor="#9c9c9c" />
        <stop offset="100%" stopColor="#6a6a6a" />
      </linearGradient>
      {/* Radial highlight for domed / glossy plastic surfaces — lit from the
          upper-left. */}
      <radialGradient id="sim-dome-sheen" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
        <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>

      {/* ---------- LED epoxy, one gradient pair per colour ---------- */}
      {Object.entries(LED_COLORS).map(([key, c]) => (
        <Fragment key={key}>
          <radialGradient id={`sim-led-${key}`} cx="36%" cy="30%" r="85%">
            <stop offset="0%" stopColor={c.tint} />
            <stop offset="45%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.dark} />
          </radialGradient>
          <radialGradient id={`sim-led-${key}-on`} cx="50%" cy="46%" r="72%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor={c.glow} />
            <stop offset="100%" stopColor={c.body} />
          </radialGradient>
        </Fragment>
      ))}
      {/* Frosted (diffused) epoxy for the RGB LED when unlit. */}
      <radialGradient id="sim-led-frost" cx="38%" cy="30%" r="85%">
        <stop offset="0%" stopColor="#f7f8fa" />
        <stop offset="55%" stopColor="#dde1e6" />
        <stop offset="100%" stopColor="#a9b0ba" />
      </radialGradient>

      {/* ---------- Push-button cap ---------- */}
      <radialGradient id="sim-btn-cap" cx="38%" cy="32%" r="80%">
        <stop offset="0%" stopColor="#8ceb9c" />
        <stop offset="45%" stopColor="#35b04e" />
        <stop offset="100%" stopColor="#1a7632" />
      </radialGradient>
      <radialGradient id="sim-btn-cap-pressed" cx="45%" cy="40%" r="80%">
        <stop offset="0%" stopColor="#4fc566" />
        <stop offset="55%" stopColor="#269642" />
        <stop offset="100%" stopColor="#14602a" />
      </radialGradient>

      {/* ---------- Servo ---------- */}
      <linearGradient id="sim-servo-blue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4a98f4" />
        <stop offset="50%" stopColor="#2c70d2" />
        <stop offset="100%" stopColor="#1b4d9a" />
      </linearGradient>
      <linearGradient id="sim-horn" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#cfd5dc" />
      </linearGradient>

      {/* ---------- DHT11 sensor housing ---------- */}
      <linearGradient id="sim-dht-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4a9be8" />
        <stop offset="55%" stopColor="#2f72c4" />
        <stop offset="100%" stopColor="#1f5096" />
      </linearGradient>

      {/* ---------- Relay can & terminal block ---------- */}
      <linearGradient id="sim-relay-blue" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4b86e6" />
        <stop offset="55%" stopColor="#2c63c4" />
        <stop offset="100%" stopColor="#1d4690" />
      </linearGradient>
      <linearGradient id="sim-terminal-blue" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2f78d8" />
        <stop offset="50%" stopColor="#5a9af2" />
        <stop offset="100%" stopColor="#245fb0" />
      </linearGradient>

      {/* ---------- Glass (tilt-switch tube, LCD) ---------- */}
      <linearGradient id="sim-glass" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="30%" stopColor="#e6f1f7" stopOpacity="0.22" />
        <stop offset="75%" stopColor="#cfe0ea" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.35" />
      </linearGradient>
      <radialGradient id="sim-ball" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#b9bec5" />
        <stop offset="100%" stopColor="#50555c" />
      </radialGradient>

      {/* ---------- LCD 1602 ---------- */}
      <linearGradient id="sim-lcd-backlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#6fd4ec" />
        <stop offset="100%" stopColor="#1a7fa0" />
      </linearGradient>
      <linearGradient id="sim-lcd-on" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3f7bf2" />
        <stop offset="55%" stopColor="#2559d6" />
        <stop offset="100%" stopColor="#1a3fa6" />
      </linearGradient>
      <radialGradient id="sim-lcd-bloom" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stopColor="#bcd6ff" stopOpacity="0.38" />
        <stop offset="100%" stopColor="#bcd6ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sim-lcd-glare" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="42%" stopColor="#ffffff" stopOpacity="0.05" />
        <stop offset="43%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      {/* One character cell of unlit / lit pixels. The renderer tiles these
          across the whole screen; lit pixels are revealed through a text mask
          so glyphs read as a dot-matrix display. */}
      <pattern id="sim-lcd-dots-off" width={LCD_CELL_W} height={LCD_CELL_H} patternUnits="userSpaceOnUse">
        {LCD_DOTS.map((d) => (
          <rect key={d.key} x={d.x} y={d.y} width={LCD_DOT_W} height={LCD_DOT_H} rx={0.35} fill="#0d2468" fillOpacity={0.5} />
        ))}
      </pattern>
      <pattern id="sim-lcd-dots-on" width={LCD_CELL_W} height={LCD_CELL_H} patternUnits="userSpaceOnUse">
        {LCD_DOTS.map((d) => (
          <rect key={d.key} x={d.x} y={d.y} width={LCD_DOT_W} height={LCD_DOT_H} rx={0.35} fill="#f4f9ff" />
        ))}
      </pattern>

      {/* ---------- Breadboard ---------- */}
      <linearGradient id="sim-bb-body" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f7f4ec" />
        <stop offset="100%" stopColor="#e3ded0" />
      </linearGradient>
      <linearGradient id="sim-bb-trench" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b9b3a2" />
        <stop offset="18%" stopColor="#d8d3c4" />
        <stop offset="82%" stopColor="#d8d3c4" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>

      {/* ---------- Filters ---------- */}
      <filter id="sim-drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.35" />
      </filter>
      <filter id="sim-drop-shadow-sm" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.3" />
      </filter>
      {/* Soft blur used for light halos (lit LEDs, IR lens, relay LEDs). */}
      <filter id="sim-glow-blur" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4.5" />
      </filter>
      <filter id="sim-glow-blur-sm" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
      {/* Soft themed halo behind the selected component. floodColor is set
          via the CSS `style` prop (rather than the XML attribute) so it can
          reference the --primary custom property and follow light/dark
          theme changes automatically. */}
      <filter id="sim-selected-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="5"
          floodOpacity="0.55"
          style={{ floodColor: "var(--primary)" }}
        />
      </filter>
    </defs>
  )
}

export const ComponentDefs = memo(ComponentDefsInner)
