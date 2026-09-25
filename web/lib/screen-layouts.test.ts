import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VALID_SCREENS } from '@/components/game/GameScreenRouter'
import { routeSegmentForScreen } from './game-route'
import { GAME_ROUTES, SCREEN_LAYOUT_TYPES, SCREEN_SURFACES, surfaceForScreen } from './screen-layouts'

const APP_DIR = join(__dirname, '..', 'app')

function pageRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return pageRoutes(full)
    if (entry !== 'page.tsx') return []
    const segments = relative(APP_DIR, dir).split(sep).filter(Boolean)
      // Route groups like (main) do not appear in the URL.
      .filter(segment => !/^\(.*\)$/.test(segment))
    return [`/${segments.join('/')}`]
  })
}

describe('GAME_ROUTES (SSL-35)', () => {
  it('lists every page under app/game plus the root entry', () => {
    const listed = new Set<string>(GAME_ROUTES.map(route => route.path))
    const pages = [...pageRoutes(join(APP_DIR, 'game')), '/']
    // /game/[screen] is covered by one entry per valid Screen below.
    for (const page of pages.filter(page => page !== '/game/[screen]')) {
      expect(listed, `${page} is missing from GAME_ROUTES`).toContain(page)
    }
  })

  it('maps every valid screen to exactly one route and layout', () => {
    for (const screen of VALID_SCREENS) {
      const matches = GAME_ROUTES.filter(route => 'screen' in route && route.screen === screen)
      expect(matches, `/game/${screen}`).toHaveLength(1)
      expect(matches[0].path).toBe(`/game/${routeSegmentForScreen(screen)}`)
      expect(surfaceForScreen(screen)).toBe(matches[0].surface)
    }
  })

  it('serves the descent screen at /game/descent, clear of the Landing type', () => {
    expect(routeSegmentForScreen('landing')).toBe('descent')
    expect(GAME_ROUTES.find(route => route.path === '/game/landing')).toMatchObject({ redirectTo: '/game/descent' })
  })

  it('has no duplicate paths', () => {
    const paths = GAME_ROUTES.map(route => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('only uses the dev surface for dev-only routes', () => {
    for (const route of GAME_ROUTES) {
      if (route.surface === 'dev') expect('dev' in route && route.dev, route.path).toBe(true)
    }
  })

  it('defines all eight layout types', () => {
    expect(SCREEN_LAYOUT_TYPES).toHaveLength(8)
    for (const type of SCREEN_LAYOUT_TYPES) expect(SCREEN_SURFACES[type]).toBeDefined()
  })
})
