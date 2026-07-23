"use client"

import { memo } from "react"

/**
 * Shared gradients/filters referenced by component renderers via url(#id).
 * Rendered once inside the canvas <svg> so ids stay unique regardless of
 * how many component instances are on the board.
 */
function ComponentDefsInner() {
  return (
    <defs>
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
      <linearGradient id="sim-board-cream" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fcfcf8" />
        <stop offset="100%" stopColor="#e6e6de" />
      </linearGradient>
      <linearGradient id="sim-metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#e4e4e4" />
        <stop offset="50%" stopColor="#a3a3a3" />
        <stop offset="100%" stopColor="#767676" />
      </linearGradient>
      <filter id="sim-drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.35" />
      </filter>
      <filter id="sim-drop-shadow-sm" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.3" />
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
