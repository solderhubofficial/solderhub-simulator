import type { ComponentDefinition } from "@/types/simulator"
import { defaultCanConnectPins } from "@/lib/simulator/utils/pins"
import { simulateSpeaker } from "@/lib/simulator/engine/component-simulation"
import { SpeakerRenderer } from "@/components/simulator/components/speaker/renderer"

export const speakerDefinition: ComponentDefinition = {
  type: "speaker",
  name: "Speaker",
  category: "output",
  width: 60,
  height: 60,
  pinTemplates: [
    { name: "positive", type: "passive", x: 8, y: 34 },
    { name: "negative", type: "passive", x: 52, y: 34 },
  ],
  defaultMetadata: {},
  canConnectPins: defaultCanConnectPins,
  getInternalConnections: () => [],
  simulate: simulateSpeaker,
  Renderer: SpeakerRenderer,
}
