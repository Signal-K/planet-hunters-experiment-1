import { describe, expect, it } from 'vitest'
import { addStamp, type ResearchStamps } from '@/lib/research/stamps'
import { giftAmount, giftableOres } from './giftRules'

describe('friend gift rules (SSL-794)', () => {
  it('gives 3 of a common or uncommon ore and 1 of a rare or exotic one', () => {
    expect(giftAmount('iron')).toBe(3)
    expect(giftAmount('nickel')).toBe(3)
    expect(giftAmount('platinum')).toBe(1)
    expect(giftAmount('rhodium')).toBe(1)
  })

  it('does not gift event evidence or unknown ids', () => {
    expect(giftAmount('leonid_debris')).toBe(0)
    expect(giftAmount('fireball_fragment')).toBe(0)
    expect(giftAmount('nothing')).toBe(0)
  })

  it('offers only ores the stash can cover', () => {
    const choices = giftableOres({ iron: 2, copper: 3, gold: 1, leonid_debris: 20 })
    expect(choices.map(c => c.id).sort()).toEqual(['copper', 'gold'])
    expect(choices.find(c => c.id === 'gold')?.amount).toBe(1)
  })

  it('a gift stamps the day once', () => {
    const at = Date.parse('2026-11-10T12:00:00Z')
    const once = addStamp<{ researchStamps?: ResearchStamps }>({ researchStamps: {} }, 'gift', at)
    expect(once.researchStamps?.['2026-11-10']).toEqual(['gift'])
    expect(addStamp(once, 'gift', at)).toBe(once)
  })
})
