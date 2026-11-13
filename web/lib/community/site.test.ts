import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SITE_RULES, buildSiteView, missionSiteCredit, siteProjectKey } from './site'

describe('Community Site ledger (SSL-758)', () => {
  it('matches shared/community/site.json', () => {
    const shared = JSON.parse(readFileSync(join(process.cwd(), '../shared/community/site.json'), 'utf8'))
    const { about: _about, ...rules } = shared
    expect(JSON.parse(JSON.stringify(SITE_RULES))).toEqual(rules)
  })

  it('credits the mission type: payload, contract, or a structural mining haul', () => {
    expect(missionSiteCredit({ payload: { type: 'satellite', name: 'x', cargoCost: 0 } }, {})).toMatchObject({ component: 'instrument', units: 25 })
    expect(missionSiteCredit({ client: 'helios' }, { platinum: 5 })).toMatchObject({ component: 'systems', units: 10 })
    // Mining 2 aluminium records 2 aluminium of credit; platinum is not structural.
    expect(missionSiteCredit({}, { aluminium: 2, platinum: 9 })).toEqual({ component: 'structure', units: 2, minerals: { aluminium: 2 } })
    expect(missionSiteCredit({}, { iron: 500 })!.units).toBe(SITE_RULES.perRun.structure)
    expect(missionSiteCredit({}, { platinum: 9 })).toBeNull()
  })

  it('caps the bar per component and names the stage', () => {
    const over = buildSiteView('p', 'spaceport-launch-site', { structure: 99_999 }, {})
    expect(over.fill).toBeCloseTo(2400 / 3900)
    expect(over.stage).toBe('Frame')
    expect(buildSiteView('p', 'unknown', {}, {}).name).toBe('Community Spaceport')
    expect(siteProjectKey(Date.parse('2026-11-12T00:00:00Z'))).toBe('community-site-2026-11')
  })
})
