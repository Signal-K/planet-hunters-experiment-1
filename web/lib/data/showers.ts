// One declaration per meteor shower (SSL-774). Code reads these, never shower names:
// community research and the badge start here.
// Window, rate, badge rule (`badgeAfterMissions`) and instrument come from sky-events.ts so they are written once.

import { DEBRIS_PRESETS, getSkyEvent, type DebrisEventPreset } from '@/lib/data/sky-events'

export interface ShowerDeclaration {
  /** Sky event id, also the badge id. */
  id: string
  name: string
  /** What the shower run delivers. */
  fragmentLabel: string
  /** The shower's own fragment resource (a DebrisEventPreset resourceId). Each shower counts only its own. */
  resourceId: string
  /** The Free Ops shower run mission and its target. */
  runMissionId: string
  targetId: string
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
  { id: 'orionids-2026', name: 'Orionids', fragmentLabel: 'fragments', resourceId: 'orionid_debris', runMissionId: 'self-directed-orionids-night-run', targetId: 'orionids-shower-field', step: fragmentStep('Orionids', 'fragments') },
  { id: 'leonids-2026', name: 'Leonids', fragmentLabel: 'fragments', resourceId: 'leonid_debris', runMissionId: 'self-directed-leonids-shower-run', targetId: 'leonids-shower-field', step: fragmentStep('Leonids', 'fragments') },
  { id: 'geminids-2026', name: 'Geminids', fragmentLabel: 'fragments', resourceId: 'geminid_debris', runMissionId: 'self-directed-geminids-shower-run', targetId: 'geminids-shower-field', step: fragmentStep('Geminids', 'fragments') },
]

export const ORIONIDS_SHOWER_ID = 'orionids-2026'

/** The shower whose run this mission is, or undefined for any other mission. */
export function showerForRunMission(missionId: string | null | undefined): ShowerDeclaration | undefined {
  return missionId ? SHOWERS.find(shower => shower.runMissionId === missionId) : undefined
}

/** The shower a fragment resource belongs to. */
export function showerForResource(resourceId: string | null | undefined): ShowerDeclaration | undefined {
  return resourceId ? SHOWERS.find(shower => shower.resourceId === resourceId) : undefined
}

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

