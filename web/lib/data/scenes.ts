// The scene/location catalog — the "where" layer.
//
// Landnam has two kinds of playable surface and they were never named as such:
//  - **Canvas scenes**: a PixiJS surface loaded from a `.scene.json` under
//    `public/game/scenes/`, with real entities.
//  - **DOM screens**: a React screen routed by `GameScreenRouter`, with no
//    entity graph at all.
//
// Both are "places the player is", both appear in the `Screen` union, and until
// this catalog existed nothing distinguished them or recorded which one owns
// which scene file. That is how `build-place.scene.json` and
// `mining-test.scene.json` ended up orphaned — no loader references either.

import type { Screen } from '@/lib/game-types'

export type SceneSurface = 'canvas' | 'dom'

/** Where the place physically is. Drives which actors may be present. */
export type SceneLocation = 'earth-base' | 'earth-base-subsurface' | 'orbit' | 'transit' | 'target-surface' | 'menu'

export interface SceneDefinition {
  id: string
  name: string
  surface: SceneSurface
  location: SceneLocation
  /** The routed screen this scene backs, when it has one. */
  screen?: Screen
  /** Path under `public/` for canvas scenes. */
  sceneFile?: string
  /** Component types the scene's entities use. Empty for DOM screens. */
  entityTypes: readonly string[]
  description: string
}

export const SCENES: readonly SceneDefinition[] = [
  {
    id: 'hub',
    name: 'Earth Base',
    surface: 'canvas',
    location: 'earth-base',
    screen: 'hub',
    sceneFile: '/game/scenes/hub.scene.json',
    entityTypes: ['BuildPlot'],
    description: 'The player\'s home surface. Four build plots hold the Launchpad, Refinery, Scan Station and — once built — the Astronaut Academy.',
  },
  {
    id: 'build-place',
    name: 'Build & Place',
    surface: 'canvas',
    location: 'earth-base',
    screen: 'build',
    sceneFile: '/game/scenes/hub.scene.json',
    entityTypes: ['BuildPlot'],
    description: 'Structure placement over the same Earth Base plots. Note it loads the hub scene — `build-place.scene.json` is orphaned.',
  },
  {
    id: 'subsurface',
    name: 'Earth Base Subsurface',
    surface: 'dom',
    location: 'earth-base-subsurface',
    entityTypes: [],
    description: 'Embedded below-soil logistics deck reached from the Earth Base scene.',
  },
  {
    id: 'subsurface-mineral-vault',
    name: 'Mineral Vault',
    surface: 'dom',
    location: 'earth-base-subsurface',
    entityTypes: [],
    description: 'Live view of the player mineral stash for refining, construction and sale.',
  },
  {
    id: 'subsurface-parts-locker',
    name: 'Parts Stores',
    surface: 'dom',
    location: 'earth-base-subsurface',
    entityTypes: [],
    description: 'Catalog of the current registered Hangar hardware loadout.',
  },
  {
    id: 'subsurface-habitat-training',
    name: 'Habitat Training',
    surface: 'dom',
    location: 'earth-base-subsurface',
    entityTypes: [],
    description: 'Feature-gated below-soil astronaut habitat rehearsal scene. No training mechanics are active yet.',
  },
  {
    id: 'mining',
    name: 'Mining Run',
    surface: 'canvas',
    location: 'target-surface',
    screen: 'mining',
    sceneFile: '/game/scenes/mining.scene.json',
    entityTypes: ['MiningController'],
    description: 'Side-on extraction run at the target. Ore nodes are spawned by the controller, not authored.',
  },
  {
    id: 'construction-target',
    name: 'On-Target Construction',
    surface: 'canvas',
    location: 'target-surface',
    sceneFile: '/game/scenes/construction-target.scene.json',
    entityTypes: ['ConstructionController'],
    description: 'Building a structure on a target body rather than at Earth Base.',
  },
  {
    id: 'target-picker',
    name: 'Solar System Map',
    surface: 'canvas',
    location: 'orbit',
    screen: 'targets',
    sceneFile: '/game/scenes/target-picker.scene.json',
    entityTypes: ['CelestialBody'],
    description: 'Eleven selectable bodies. Entity ids join to the TARGETS catalog for the real orbit and mineral data.',
  },
  { id: 'intro', name: 'Intro', surface: 'dom', location: 'menu', screen: 'intro', entityTypes: [], description: 'Cold open and sign-in.' },
  { id: 'missions', name: 'Mission Board', surface: 'dom', location: 'earth-base', screen: 'missions', entityTypes: [], description: 'Live client contract list.' },
  { id: 'rocket-buy', name: 'Rocket Purchase', surface: 'dom', location: 'earth-base', screen: 'rocket-buy', entityTypes: [], description: 'Buy the rocket model for this run.' },
  { id: 'fab', name: 'Assembly', surface: 'dom', location: 'earth-base', screen: 'fab', entityTypes: [], description: 'Relay/launch checklist before a mission flies.' },
  { id: 'transit', name: 'Transit', surface: 'dom', location: 'transit', screen: 'transit', entityTypes: [], description: 'Physical rocket flight. Not TESS transit photometry — see the glossary rule in CLAUDE.md.' },
  { id: 'rover-mining', name: 'Rover Mining', surface: 'dom', location: 'target-surface', screen: 'rover-mining', entityTypes: [], description: 'Deployed-rover extraction, timer-based rather than played live.' },
  { id: 'debrief', name: 'Debrief', surface: 'dom', location: 'earth-base', screen: 'debrief', entityTypes: [], description: 'Payout and cargo settlement after a run.' },
  { id: 'refinery', name: 'Refinery', surface: 'dom', location: 'earth-base', screen: 'refinery', entityTypes: [], description: 'Refine raw minerals into higher-value goods.' },
  { id: 'market', name: 'Market', surface: 'dom', location: 'earth-base', screen: 'market', entityTypes: [], description: 'Open-market sales with supply-driven price decay.' },
  { id: 'hangar', name: 'Hangar', surface: 'dom', location: 'earth-base', screen: 'hangar', entityTypes: [], description: 'Owned ships and the ship customiser interior view.' },
  { id: 'skills', name: 'Skill Tree', surface: 'dom', location: 'menu', screen: 'skills', entityTypes: [], description: 'Four branches — mining, cargo, range, engineering.' },
  { id: 'scan-station', name: 'Scan Station', surface: 'dom', location: 'earth-base', screen: 'scan-station', entityTypes: [], description: 'Daily target scans; grants research XP.' },
  { id: 'launchpad', name: 'Launchpad', surface: 'dom', location: 'earth-base', screen: 'launchpad', entityTypes: [], description: 'The player\'s own program — satellites and self-directed runs they launch on their own initiative. Client contracts live one press away on the Mission Board.' },
  { id: 'galaxy', name: 'Galaxy Map', surface: 'dom', location: 'orbit', screen: 'galaxy', entityTypes: [], description: 'Star map beyond the solar system. Free Ops only.' },
]

const BY_ID = new Map(SCENES.map(s => [s.id, s]))

export function getScene(id: string): SceneDefinition | undefined {
  return BY_ID.get(id)
}

export function scenesAtLocation(location: SceneLocation): SceneDefinition[] {
  return SCENES.filter(s => s.location === location)
}

/** Scene files on disk that no SceneDefinition claims. Asserted in tests so orphans get noticed. */
export const KNOWN_SCENE_FILES: readonly string[] = [
  '/game/scenes/hub.scene.json',
  '/game/scenes/build-place.scene.json',
  '/game/scenes/mining.scene.json',
  '/game/scenes/mining-test.scene.json',
  '/game/scenes/construction-target.scene.json',
  '/game/scenes/target-picker.scene.json',
]

export function orphanedSceneFiles(): string[] {
  const claimed = new Set(SCENES.map(s => s.sceneFile).filter((f): f is string => !!f))
  return KNOWN_SCENE_FILES.filter(f => !claimed.has(f))
}
