import { describe, expect, it } from 'vitest'
import { DEV_GROUPS, resolvePreset } from './devPresets'
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

  it('lands every gameplay screen in at least one preset', () => {
    const landed = new Set(keys.map(k => resolvePreset(k)?.screen))
    const missing = GAME_SCREENS.filter(s => !landed.has(s))
    expect(missing).toEqual([])
  })
})
