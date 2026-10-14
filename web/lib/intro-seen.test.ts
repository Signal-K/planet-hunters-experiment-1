import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { afterIntroScreen, hasProgress, hasSeenIntro, INTRO_SEEN_STORAGE_KEY, introAlreadyDone, markIntroSeen } from './intro-seen'

const newPlayer = { missionsDone: 0, placed: [] as string[] }

describe('intro seen flag', () => {
  const store = new Map<string, string>()
  const previousWindow = globalThis.window

  beforeEach(() => {
    store.clear()
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value) },
      },
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => { globalThis.window = previousWindow })

  it('is unseen until the player begins, then persists', () => {
    expect(hasSeenIntro()).toBe(false)
    markIntroSeen()
    expect(hasSeenIntro()).toBe(true)
    expect(store.get(INTRO_SEEN_STORAGE_KEY)).toBe('1')
  })

  it('treats any progress as past the intro', () => {
    expect(hasProgress(newPlayer)).toBe(false)
    expect(hasProgress({ missionsDone: 1, placed: [] })).toBe(true)
    expect(hasProgress({ missionsDone: 0, placed: ['launchpad'] })).toBe(true)
  })

  it('shows the intro to a signed-in new player exactly once', () => {
    expect(introAlreadyDone(newPlayer, true)).toBe(false)
    markIntroSeen()
    expect(introAlreadyDone(newPlayer, true)).toBe(true)
  })

  it('skips the intro for a player whose save already has progress, before any flag is written', () => {
    expect(introAlreadyDone({ missionsDone: 0, placed: ['launchpad'] }, true)).toBe(true)
  })

  it('never skips without an account, so presets and the stage still render the intro', () => {
    markIntroSeen()
    expect(introAlreadyDone(newPlayer, false)).toBe(false)
  })

  it('lands on the Base once something is placed, otherwise on first-time placement', () => {
    expect(afterIntroScreen(newPlayer)).toBe('build')
    expect(afterIntroScreen({ placed: ['launchpad'] })).toBe('hub')
  })

  it('does not throw when storage is blocked', () => {
    globalThis.window = {
      get localStorage(): never { throw new Error('blocked') },
    } as unknown as Window & typeof globalThis
    expect(hasSeenIntro()).toBe(false)
    expect(() => markIntroSeen()).not.toThrow()
  })
})
