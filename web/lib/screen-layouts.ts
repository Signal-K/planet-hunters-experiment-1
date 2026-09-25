import type { Screen } from '@/lib/game-types'

/**
 * SSL-35: the eight Landnam screen layout types. Every screen is one of these
 * or one of the two stand-alone mission surfaces below; the shared
 * `ScreenFrame` gives each the same named slots (top bar, main area, bottom
 * bar, overlay layer for pop-ups and sheets).
 */
export const SCREEN_LAYOUT_TYPES = [
  'landing',
  'launch',
  'orbit',
  'mining',
  'home',
  'instrument',
  'map',
  'takeon',
] as const
export type ScreenLayoutType = typeof SCREEN_LAYOUT_TYPES[number]

/** Mission setup and Post-mission summary keep their own screens but sit on
 * the same frame (no boxed card on desktop). */
const MISSION_SURFACES = ['mission-setup', 'post-mission'] as const
export type MissionSurface = typeof MISSION_SURFACES[number]

/** Dev-only tooling (launcher, redirect shortcuts, Forge preview) renders no
 * player layout at all. */
export type ScreenSurface = ScreenLayoutType | MissionSurface | 'dev'

export interface ScreenSurfaceSpec {
  label: string
  /** `floating`: top and bottom bars sit transparently over the main area
   * (the world shows through). `docked`: bars take their own rows. */
  chrome: 'floating' | 'docked'
  summary: string
}

export const SCREEN_SURFACES: Record<Exclude<ScreenSurface, 'dev'>, ScreenSurfaceSpec> = {
  landing: { label: 'Landing', chrome: 'docked', summary: 'Base yard grows in a light loop, then Continue / Start new game, then sign in.' },
  launch: { label: 'Launch', chrome: 'floating', summary: 'The launch sequence. Every launch renders here; it has no URL of its own.' },
  orbit: { label: 'Orbit', chrome: 'docked', summary: 'Rocket in flight, with « » to switch between missions in progress.' },
  mining: { label: 'Mining / hovering', chrome: 'floating', summary: 'Descent and mining at a target.' },
  home: { label: 'Home (Earth Base)', chrome: 'floating', summary: 'Tap rockets in the sky and buildings on the landscape. Bottom bar: « » Market Menu.' },
  instrument: { label: 'Instrument', chrome: 'docked', summary: 'Inside a building or instrument: consoles, hangar, academy, refinery, skills, community.' },
  map: { label: 'Map / navigation', chrome: 'docked', summary: 'Choosing a target on the map.' },
  takeon: { label: 'Takeon', chrome: 'floating', summary: 'Shell around a vendored TakeOn module.' },
  'mission-setup': { label: 'Mission setup', chrome: 'docked', summary: 'Contract, rocket and preflight steps.' },
  'post-mission': { label: 'Post-mission summary', chrome: 'docked', summary: 'Debrief after a run.' },
}

export interface GameRoute {
  /** Next.js path pattern, as written under `web/app`. */
  path: string
  surface: ScreenSurface
  /** Set for `/game/[screen]` routes: the `Screen` the URL resolves to. */
  screen?: Screen
  /** Only served in development / staging. */
  dev?: boolean
  /** The route only redirects; `surface` is where the player ends up. */
  redirectTo?: string
}

/**
 * Every route under `web/app/game/**` (plus the `/` entry), mapped to exactly
 * one layout type. `lib/screen-layouts.test.ts` fails if a page file or a
 * valid `Screen` is missing from this list.
 */
export const GAME_ROUTES = [
  // Landing
  { path: '/', surface: 'landing', redirectTo: '/game' },
  { path: '/game', surface: 'landing', redirectTo: '/game/<saved screen>' },
  { path: '/game/intro', screen: 'intro', surface: 'landing' },

  // Home
  { path: '/game/hub', screen: 'hub', surface: 'home' },
  { path: '/game/build', screen: 'build', surface: 'home' },
  // Market is a pop-up over Home; the old page URL opens it there.
  { path: '/game/market', screen: 'market', surface: 'home', redirectTo: '/game/hub (Market pop-up open)' },

  // Mission setup
  { path: '/game/missions', screen: 'missions', surface: 'mission-setup' },
  { path: '/game/rocket-buy', screen: 'rocket-buy', surface: 'mission-setup' },
  { path: '/game/fab', screen: 'fab', surface: 'mission-setup' },

  // Map / navigation
  { path: '/game/targets', screen: 'targets', surface: 'map' },

  // Orbit
  { path: '/game/transit', screen: 'transit', surface: 'orbit' },

  // Mining / hovering
  // The descent screen keeps its internal `landing` value; see routeSegmentForScreen.
  { path: '/game/descent', screen: 'landing', surface: 'mining' },
  { path: '/game/landing', surface: 'mining', redirectTo: '/game/descent' },
  { path: '/game/mining', screen: 'mining', surface: 'mining' },

  // Takeon
  { path: '/game/rover-mining', screen: 'rover-mining', surface: 'takeon' },
  { path: '/game/delivery', screen: 'delivery', surface: 'takeon' },
  { path: '/game/surface-ops', screen: 'surface-ops', surface: 'takeon' },

  // Post-mission summary
  { path: '/game/debrief', screen: 'debrief', surface: 'post-mission' },

  // Instrument
  { path: '/game/instrument-hub', screen: 'instrument-hub', surface: 'instrument' },
  { path: '/game/galaxy', screen: 'galaxy', surface: 'instrument' },
  { path: '/game/asteroid-discovery', screen: 'asteroid-discovery', surface: 'instrument' },
  { path: '/game/hangar', screen: 'hangar', surface: 'instrument' },
  { path: '/game/academy', screen: 'academy', surface: 'instrument' },
  { path: '/game/refinery', screen: 'refinery', surface: 'instrument' },
  { path: '/game/skills', screen: 'skills', surface: 'instrument' },
  { path: '/game/launchpad', screen: 'launchpad', surface: 'instrument' },
  { path: '/game/mission-history', screen: 'mission-history', surface: 'instrument' },
  { path: '/game/narrative-ledger', screen: 'narrative-ledger', surface: 'instrument', dev: true },

  // Dev-only
  { path: '/game/launcher', surface: 'dev', dev: true },
  { path: '/game/demo', surface: 'dev', dev: true },
  { path: '/game/demo/[preset]', surface: 'dev', dev: true, redirectTo: '/game/<preset screen>' },
  { path: '/game/mission/[[...slug]]', surface: 'dev', dev: true, redirectTo: '/game/<preset screen>' },
  { path: '/game/ui/[[...slug]]', surface: 'dev', dev: true, redirectTo: '/game/<preset screen>' },
  { path: '/game/preview', surface: 'dev', dev: true },
  { path: '/game/construction-kit-demo', surface: 'dev', dev: true },
  { path: '/game/landscape-lab', surface: 'home', dev: true },
  { path: '/game/control-room-preview', surface: 'instrument', dev: true },
  { path: '/game/ship-customizer', surface: 'instrument', dev: true },
  { path: '/game/mission-flow-preview', surface: 'mission-setup', dev: true },
  { path: '/game/takeon-preview', surface: 'takeon', dev: true },
  { path: '/game/transit-demo', surface: 'orbit', dev: true },
] as const satisfies readonly GameRoute[]

type ScreenRoute = Extract<typeof GAME_ROUTES[number], { screen: Screen }>

const SURFACE_BY_SCREEN = new Map<Screen, ScreenSurface>(
  GAME_ROUTES.filter((route): route is ScreenRoute => 'screen' in route).map(route => [route.screen, route.surface]),
)

/** Layout for a `game.screen`. Falls back to Home, the de facto root. */
export function surfaceForScreen(screen: Screen): Exclude<ScreenSurface, 'dev'> {
  const surface = SURFACE_BY_SCREEN.get(screen)
  return surface && surface !== 'dev' ? surface : 'home'
}
