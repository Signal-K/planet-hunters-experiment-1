import { describe, expect, it } from 'vitest'
import { TARGETS } from '@/lib/data'
import { masteryBonus, showerSpecials, specialId, specialMissions } from './special-missions'

const at = Date.parse('2026-10-22T03:00:00Z')
const badge = (eventId: string, tier: 'gold' | 'silver') => ({ [eventId]: { eventId, tier, earnedAt: at } })

describe('shower special missions (SSL-657)', () => {
  it('opens nothing before the event is finished', () => {
    expect(showerSpecials('leonids-2026', {}).every(s => s.state === 'locked')).toBe(true)
    expect(specialMissions(TARGETS, {})).toEqual([])
  })

  it('gives silver the impact survey and gold the pristine recovery too', () => {
    const silver = showerSpecials('leonids-2026', { badges: badge('leonids-2026', 'silver') })
    expect(silver.filter(s => s.state === 'open').map(s => s.id)).toEqual([specialId('leonids-2026', 'trail')])
    const gold = showerSpecials('leonids-2026', { badges: badge('leonids-2026', 'gold') })
    expect(gold.filter(s => s.state === 'open').map(s => s.id)).toEqual([specialId('leonids-2026', 'trail'), specialId('leonids-2026', 'pristine')])
  })

  it('stacks the voucher and Mastery keys, and Mastery raises every payout', () => {
    const find = { subjectId: 'tic-1', targetId: null, name: 'TIC 1', tier: 'gold' as const, earnedAt: at, marker: 'orionids-found' as const, voucher: 'owned' as const }
    const base = { badges: badge('orionids-2026', 'gold'), orionidsFinds: { 'tic-1': find } }
    const mastered = { ...base, meteoriteMastery: 1 }
    expect(showerSpecials('orionids-2026', base).filter(s => s.state === 'open')).toHaveLength(3)
    expect(showerSpecials('orionids-2026', mastered).filter(s => s.state === 'open')).toHaveLength(4)
    expect(masteryBonus(mastered)).toBeCloseTo(0.1)
    const pay = (p: typeof base) => specialMissions(TARGETS, p).find(m => m.id === specialId('orionids-2026', 'trail'))!.payout.francs
    expect(pay(mastered)).toBeGreaterThan(pay(base))
  })

  it('is flown once, and each special is a Free run on its own body', () => {
    const player = { badges: badge('leonids-2026', 'gold') }
    const missions = specialMissions(TARGETS, player)
    expect(missions.map(m => m.targetId)).toEqual(['itokawa', 'psyche'])
    expect(missions.every(m => m.id.startsWith('self-directed-') && !m.client)).toBe(true)
    const flown = new Set([specialId('leonids-2026', 'trail')])
    expect(specialMissions(TARGETS, player, flown).map(m => m.targetId)).toEqual(['psyche'])
    expect(showerSpecials('leonids-2026', player, flown)[0].state).toBe('flown')
  })
})
