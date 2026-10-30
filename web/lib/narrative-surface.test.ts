import { describe, expect, it } from 'vitest'
import { GAME_SCREENS } from './game-screens'
import { NARRATIVE_ROLE, SPINE, screensWithRole } from './narrative-surface'

describe('narrative surface', () => {
  it('classifies exactly the screens the game routes', () => {
    expect(Object.keys(NARRATIVE_ROLE).sort()).toEqual([...GAME_SCREENS].sort())
  })
  it('has at least one screen for every stop of the spine', () => {
    expect(SPINE.filter(role => screensWithRole(role).length === 0)).toEqual([])
  })
})
