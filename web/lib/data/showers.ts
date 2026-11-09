// One declaration per meteor shower (SSL-774). Code reads these, never shower names:
// the probe mission, the probe field scene, community research and the badge all start here.
// Window, rate, badge rule (`badgeAfterMissions`) and instrument come from sky-events.ts so they are written once.

import { DEBRIS_PRESETS, getSkyEvent, type DebrisEventPreset } from '@/lib/data/sky-events'

export interface ShowerDeclaration {
  /** Sky event id, also the badge id. */
  id: string
  name: string
  /** Where the probe is deployed. A target id (`targets.ts`) that has no air, so the sky is clear. */
  probeBody: string
  /** What the shower run delivers, and what the probe watches for. */
  fragmentLabel: string
  /** Community research event step before and after the player has taken part. */
  step: { open: { title: string; brief: string }; done: (callsign: string) => { title: string; brief: string } }
}

const fragmentStep = (name: string, noun: string): ShowerDeclaration['step'] => ({
  open: { title: `${name}: catch and contribute ${noun}`, brief: `Fly the shower run and bring the ${noun} home for the community record.` },
  done: callsign => ({
    title: `${name}: ${noun} delivered`,
    brief: `Your ${noun} are in the record. ${callsign} is still listening: every recording you check fills the shared bar.`,
  }),
})

export const SHOWERS: ReadonlyArray<ShowerDeclaration> = [
  { id: 'orionids-2026', name: 'Orionids', probeBody: 'eros', fragmentLabel: 'fragments', step: fragmentStep('Orionids', 'fragments') },
  { id: 'leonids-2026', name: 'Leonids', probeBody: 'eros', fragmentLabel: 'fragments', step: fragmentStep('Leonids', 'fragments') },
  { id: 'geminids-2026', name: 'Geminids', probeBody: 'eros', fragmentLabel: 'fragments', step: fragmentStep('Geminids', 'fragments') },
]

export function getShower(eventId: string | undefined): ShowerDeclaration | undefined {
  return SHOWERS.find(shower => shower.id === eventId)
}

/** The shower's rate, window and resource, from the debris presets. */
export function showerPreset(eventId: string): DebrisEventPreset | undefined {
  return DEBRIS_PRESETS.find(preset => preset.eventId === eventId)
}

/** The instrument callsign community research listens on for this shower. */
export function showerInstrument(eventId: string): { callsign: string; name: string } {
  return getSkyEvent(eventId)?.communityInstrument ?? { callsign: 'RX-1', name: 'Community receiver' }
}
