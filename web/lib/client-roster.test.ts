import { describe, expect, it } from 'vitest'
import { CLIENTS } from '@/lib/data/clients'
import { clientRoster, clientStanding } from '@/lib/client-roster'

const helios = CLIENTS['helios-propulsion-depot']

describe('client roster', () => {
  it('reads level, progress to the next level and the capped affinity bonus from completed jobs', () => {
    expect(clientStanding(helios, 0)).toMatchObject({ level: 1, jobsInLevel: 0, bonus: 0, met: false })
    expect(clientStanding(helios, 7)).toMatchObject({ level: 2, jobsInLevel: 2, jobsPerLevel: 5, met: true })
    expect(clientStanding(helios, 7).bonus).toBeCloseTo(0.15)
    expect(clientStanding(helios, 7).bonusMaxed).toBe(true)
    expect(clientStanding(helios, 0, 2)).toMatchObject({ met: true, offers: 2 })
  })

  it('lists every client, met ones first by jobs done', () => {
    const roster = clientRoster(Object.values(CLIENTS), { 'lumen-research': 1, 'helios-propulsion-depot': 2 }, ['atlas-aggregate'])
    expect(roster).toHaveLength(Object.keys(CLIENTS).length)
    expect(roster.slice(0, 3).map(r => r.client.id)).toEqual(['helios-propulsion-depot', 'lumen-research', 'atlas-aggregate'])
    expect(roster.slice(3).every(r => !r.met)).toBe(true)
  })

  it('leaves unnamed catalogue slots off the list unless you have worked with them', () => {
    const slot = { ...helios, id: 'contractor-04b', name: 'Client Slot 04B' }
    expect(clientRoster([helios, slot], {}, []).map(r => r.client.id)).toEqual(['helios-propulsion-depot'])
    expect(clientRoster([helios, slot], { 'contractor-04b': 1 }, []).map(r => r.client.id)).toContain('contractor-04b')
  })
})
