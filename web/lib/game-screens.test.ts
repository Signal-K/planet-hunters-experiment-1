import { describe, expect, it } from 'vitest'
import { migrateScreenId, VALID_SCREENS } from './game-screens'
import { normalizeState } from './game-state'
import { returningScreen } from './initial-route'

describe('renamed screens (SSL-817)', () => {
  it('maps old ids to the new ones and leaves the rest alone', () => {
    expect(migrateScreenId('galaxy')).toBe('tess-discovery')
    expect(migrateScreenId('transit')).toBe('flight')
    expect(migrateScreenId('hub')).toBe('hub')
    expect(VALID_SCREENS.has('galaxy' as never)).toBe(false)
  })

  it('loads a save written with an old screen id', () => {
    expect(normalizeState({ screen: 'galaxy' as never }).screen).toBe('tess-discovery')
    expect(normalizeState({ screen: 'transit' as never }).screen).toBe('flight')
  })

  it('resumes an old in-flight save on the flight screen', () => {
    const raw = JSON.stringify({ screen: 'transit', missionId: 'm', targetId: 't' })
    expect(returningScreen(raw)).toBe('flight')
  })
})
