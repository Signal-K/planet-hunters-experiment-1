import { describe, expect, it } from 'vitest'
import { returningScreen } from './initial-route'

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
