import { describe, expect, it } from 'vitest'
import { CLIENT_TERRITORIES, PREDEFINED_SITE_RIGHTS, predefinedSiteRightById } from './site-rights'
import { createSiteRightsState, siteIsInClientTerritory } from '@/lib/systems/SiteRightsSystem'

describe('predefined site-right catalogue', () => {
  it('maps every live Surface Ops location to one client territory and explicit purchase/lease offers', () => {
    expect(PREDEFINED_SITE_RIGHTS).toHaveLength(3)
    expect(CLIENT_TERRITORIES).toHaveLength(PREDEFINED_SITE_RIGHTS.length)
    const territoryState = createSiteRightsState([...CLIENT_TERRITORIES])

    for (const site of PREDEFINED_SITE_RIGHTS) {
      expect(siteIsInClientTerritory(territoryState, site)).toBe(true)
      expect(site.offers.map(offer => offer.mode)).toEqual(['purchase', 'lease'])
      expect(predefinedSiteRightById(site.id)).toEqual(site)
    }
  })
})
