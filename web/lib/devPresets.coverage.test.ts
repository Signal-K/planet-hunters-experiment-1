import { describe, expect, it } from 'vitest'
import { DEV_GROUPS, resolvePreset } from './devPresets'
import { missionTestPaths } from './mission-test-paths'
import { GAME_SCREENS } from './game-screens'

// The stage can only show a scene that has a fixture. If this fails, add a preset for the new screen.
describe('dev preset coverage', () => {
  const keys = DEV_GROUPS.flatMap(g => g.shots.map(s => s.key))

  it('has unique preset keys', () => {
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('resolves every listed preset', () => {
    for (const k of keys) expect(resolvePreset(k), k).not.toBeNull()
  })

  it('resolves each mission path checkpoint to a registered fixture', () => {
    for (const paths of Object.values(missionTestPaths)) {
      for (const path of paths) {
        for (const [, preset] of path.steps) expect(keys, path.mission).toContain(preset)
      }
    }
  })

  it('uses the selected body for each regional probe fixture', () => {
    for (const id of ['mars', 'europa']) {
      expect(Object.keys(resolvePreset('ui-probe-' + id)?.player?.probes ?? {})).toEqual([id])
    }
  })

  it('lands every gameplay screen in at least one preset', () => {
    const landed = new Set(keys.map(k => resolvePreset(k)?.screen))
    const missing = GAME_SCREENS.filter(s => !landed.has(s))
    expect(missing).toEqual([])
  })
})
