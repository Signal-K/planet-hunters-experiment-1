// Tap a building in a TakeOn base scene to ring it and see what it is for.
// Shared by the home step and the route, so the base reads the same on both.
import { useRef, useState } from 'react'
import type { MinimalSceneHandle } from '@takeon/engine'

/** What each base building is for, shown when the player taps it. */
export const BUILDING_ROLES: Record<string, string> = {
  'agency-hq': 'Your agency. Every contract starts here.',
  'launch-pad': 'Where every flight lifts off.',
  'solar-farm': 'Powers the base. Its line runs along the roads.',
  warehouse: 'Holds the crates your runs bring home.',
  'fuel-depot': 'Fuels the rockets for longer flights.',
  'comms-dish': 'Talks to your satellites in orbit.',
  hangar: 'Builds and stores your survey probes.',
  observatory: 'Watches for meteor showers and new worlds.',
  silo: 'Stores raw materials for construction.',
  'assembly-hall': 'Raises structures from what you haul.',
  habitat: 'Where your crew lives between flights.',
  'drill-rig': 'Drills the ground under the base.',
}

export type PickedBuilding = { id: string; asset: string; name: string }

/**
 * The scene handle, the picked building and a click handler for the scene's
 * root: a tap on the canvas picks the building under it (tap it again, or
 * open ground, to clear). Taps on buttons and cards are ignored.
 */
export function useBuildingPick() {
  const scene = useRef<MinimalSceneHandle | null>(null)
  const [picked, setPicked] = useState<PickedBuilding | null>(null)
  const tap = (e: React.MouseEvent) => {
    if (!(e.target instanceof HTMLCanvasElement)) return
    const r = e.target.getBoundingClientRect()
    const hit = scene.current?.pick(e.clientX - r.left, e.clientY - r.top) ?? null
    const next = hit && hit.id !== picked?.id ? hit : null
    scene.current?.select(next?.id ?? null)
    setPicked(next)
  }
  return { scene, picked, tap }
}

export function PickedCard({ picked }: { picked: PickedBuilding }) {
  return (
    <section className="mn-card" data-picked={picked.asset}>
      <p className="mn-goal">{picked.name}</p>
      <p className="mn-note">{BUILDING_ROLES[picked.asset] ?? 'Part of your base.'}</p>
    </section>
  )
}
