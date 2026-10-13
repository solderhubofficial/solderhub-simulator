/** Ask the canvas to frame the whole circuit (after import, project load, Fit button). */
export function requestFitView() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("simulator:fit-view"))
}
