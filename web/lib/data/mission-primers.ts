import type { Mission } from './types'

/**
 * Short "what kind of job is this" primer, shown on the Mission Board below
 * the contract list.
 *
 * This deliberately describes the *shape of the run* (which legs you fly, what
 * you get paid for) and never this specific contract's numbers, client, or
 * route — those already live in the Contract Detail panel beside it. Keeping
 * the two separate is what lets the detail copy stay specific while a new
 * player still gets a one-glance read of the mission type.
 */
export interface MissionTypePrimer {
  /** Name of the mission *type*, not the contract's title. */
  label: string
  /** One sentence on how the type plays. Keep it under ~25 words. */
  summary: string
  /** Ordered legs of the run, as short uppercase-able labels. */
  steps: string[]
  /**
   * Who the run belongs to. 'self' means the player's own program — no client
   * issued it, nobody else owns what it leaves behind.
   */
  owner: 'client' | 'self'
}

/**
 * The synthetic client the player's own story/program operations are filed
 * under at runtime (see STORY_MISSION_CLIENT_ID in lib/runtimeCatalog.ts —
 * duplicated as a literal here to keep lib/data free of a cycle back through
 * lib/catalog). It is the player's own mission control, not a customer.
 */
export const OWN_PROGRAM_CLIENT_ID = 'mission-control'

/**
 * True when the mission is the player's own operation rather than work for a
 * client: self-directed Free Ops runs, and anything the player launches for
 * their own program (the transit telescope and any future satellite launch).
 * Those deploy *the player's* entities — they must never be presented as a
 * client request, carry a client premium, or earn client affinity.
 */
export function isOwnProgramMission(mission: Mission): boolean {
  return !mission.client
    || mission.client === OWN_PROGRAM_CLIENT_ID
    || mission.payload?.type === 'satellite'
}

export function missionTypePrimer(mission: Mission): MissionTypePrimer {
  const owner: MissionTypePrimer['owner'] = isOwnProgramMission(mission) ? 'self' : 'client'

  // Your own orbital assets first — a satellite/telescope launch is never a
  // client job even when it is filed under Mission Control.
  if (mission.payload?.type === 'satellite') {
    return {
      label: 'Satellite launch',
      summary: 'Carry your own satellite up, release it into orbit, and bring the ship home. Nothing is mined and nothing is sold.',
      steps: ['Launch', 'Deploy', 'Return'],
      owner,
    }
  }

  if (mission.payload?.type === 'rover') {
    return {
      label: 'Rover drop',
      summary: owner === 'self'
        ? 'Carry your rover out and deploy it on the surface. It stays there working after the ship comes home.'
        : 'Carry the client\'s rover out and deploy it on the surface. No drilling on this run.',
      steps: ['Launch', 'Deploy', 'Return'],
      owner,
    }
  }

  if (mission.construction) {
    return {
      label: owner === 'self' ? 'Own infrastructure build' : 'Client build job',
      summary: owner === 'self'
        ? 'Haul the materials out and raise the structure on site. It stays yours and keeps working after you leave.'
        : 'Haul the materials out and raise the client\'s structure on site before heading home.',
      steps: ['Launch', 'Deliver', 'Build', 'Return'],
      owner,
    }
  }

  if (mission.survey?.onWorldVehicle) {
    return {
      label: 'Rover landing',
      summary: 'Land the rover, scan the surface for deposits, then mine what it finds before flying home.',
      steps: ['Launch', 'Land', 'Scan', 'Mine'],
      owner,
    }
  }

  if (mission.survey?.scanRequired) {
    return {
      label: 'Mapping scan',
      summary: 'Fly out and scan the surface. The readings are the deliverable — no drill and no cargo needed.',
      steps: ['Launch', 'Scan', 'Return'],
      owner,
    }
  }

  if (mission.tag === 'SCIENCE') {
    return {
      label: 'Discovery survey',
      summary: 'A follow-up flight to a world you found yourself. Fly out, run the survey, come home.',
      steps: ['Launch', 'Survey', 'Return'],
      owner,
    }
  }

  if (mission.deliveryTargetId) {
    return {
      label: 'Two-stop delivery',
      summary: 'Mine at the first stop, drop the cargo at the second, then fly home. You are paid a mining fee and a transport fee.',
      steps: ['Mine', 'Deliver', 'Return'],
      owner,
    }
  }

  if (owner === 'self') {
    return {
      label: 'Self-directed run',
      summary: 'No client and no order to fill. Pick any reachable target, mine what looks valuable, and sell the haul yourself.',
      steps: ['Launch', 'Mine', 'Sell'],
      owner,
    }
  }

  return {
    label: 'Mining run',
    summary: 'Fly out, drill the minerals the client ordered, and bring the cargo back to Earth.',
    steps: ['Launch', 'Mine', 'Return'],
    owner,
  }
}
