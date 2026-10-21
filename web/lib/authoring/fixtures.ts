// Stage fixtures for a screen: the curated [[states]] of its scene script, then every dev preset that opens that screen.
import { DEV_GROUPS, resolvePreset } from '@/lib/devPresets'
import type { Fixture } from './studio-types'

let byScreen: Map<string, Fixture[]> | null = null

function index(): Map<string, Fixture[]> {
  if (byScreen) return byScreen
  byScreen = new Map()
  for (const group of DEV_GROUPS) {
    for (const shot of group.shots) {
      const screen = resolvePreset(shot.key)?.screen
      if (!screen) continue
      const list = byScreen.get(screen) ?? []
      list.push({ key: shot.key, label: shot.label, hint: shot.hint, group: group.label })
      byScreen.set(screen, list)
    }
  }
  return byScreen
}

export function fixturesForRoute(route: string, curated: { label: string; preset: string; note?: string }[] = []): Fixture[] {
  const auto = index().get(route) ?? []
  const first: Fixture[] = curated.map(c => ({ key: c.preset, label: c.label, hint: c.note ?? auto.find(a => a.key === c.preset)?.hint, group: 'Curated', curated: true }))
  return [...first, ...auto.filter(a => !first.some(f => f.key === a.key))]
}

export const allFixtureKeys = (): Set<string> => new Set([...index().values()].flat().map(f => f.key))
