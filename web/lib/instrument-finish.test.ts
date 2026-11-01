import { describe, it, expect } from 'vitest'
import { AUTO_FINISH, INSTRUMENT_FINISHES, finishForLevel, nextFinishChoice, resolveFinish, unlockedFinishes } from './instrument-finish'

describe('instrument finishes', () => {
  it('gives each level its own colourway and wraps after the last', () => {
    expect(finishForLevel(1).id).toBe('indigo')
    expect(finishForLevel(2).id).toBe('ember')
    expect(finishForLevel(INSTRUMENT_FINISHES.length + 1).id).toBe('indigo')
  })

  it('unlocks one finish per level', () => {
    expect(unlockedFinishes(1).map(f => f.id)).toEqual(['indigo'])
    expect(unlockedFinishes(3).map(f => f.id)).toEqual(['indigo', 'ember', 'glacier'])
  })

  it('honours a pinned finish only while it is unlocked', () => {
    expect(resolveFinish('indigo', 3).id).toBe('indigo')
    expect(resolveFinish('solar', 2).id).toBe('ember')
    expect(resolveFinish(AUTO_FINISH, 4).id).toBe('solar')
  })

  it('steps AUTO through every unlocked finish and back', () => {
    expect(nextFinishChoice(AUTO_FINISH, 2)).toBe('indigo')
    expect(nextFinishChoice('indigo', 2)).toBe('ember')
    expect(nextFinishChoice('ember', 2)).toBe(AUTO_FINISH)
    expect(nextFinishChoice(AUTO_FINISH, 1)).toBe('indigo')
  })
})
