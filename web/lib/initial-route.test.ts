import { describe, expect, it } from 'vitest'
import { isResumableMissionScreen, returningScreen } from './initial-route'

describe('returning player entry route', () => {
  it('opens Earth Base after a previous visit to Contracts', () => {
    expect(returningScreen(JSON.stringify({ screen: 'missions' }))).toBe('hub')
  })

  it('preserves an actionable mission flow', () => {
    expect(returningScreen(JSON.stringify({
      screen: 'mining',
      missionId: 'mission-1',
      targetId: 'eros',
    }))).toBe('mining')
  })

  it('keeps first-time placement available', () => {
    expect(returningScreen(JSON.stringify({ screen: 'build', player: { placed: [] } }))).toBe('build')
  })

  it('falls back to Earth Base for malformed or non-home screens', () => {
    expect(returningScreen('{broken')).toBe('hub')
    expect(returningScreen(JSON.stringify({ screen: 'skills' }))).toBe('hub')
  })
})

describe('isResumableMissionScreen', () => {
  it('is false for missions itself, even with no mission/target ids', () => {
    expect(isResumableMissionScreen('missions', null, null)).toBe(false)
  })

  it('is true for an in-flight mission screen with both ids present', () => {
    expect(isResumableMissionScreen('mining', 'mission-1', 'eros')).toBe(true)
  })

  it('is false when either id is missing', () => {
    expect(isResumableMissionScreen('mining', null, 'eros')).toBe(false)
    expect(isResumableMissionScreen('mining', 'mission-1', null)).toBe(false)
  })

  it('is false for a non-resumable screen even with both ids present', () => {
    expect(isResumableMissionScreen('hub', 'mission-1', 'eros')).toBe(false)
  })
})
