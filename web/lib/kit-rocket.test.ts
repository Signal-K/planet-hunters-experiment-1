import { describe, expect, it } from 'vitest'
import { KIT_ROCKET_CORE, kitRocketSrc } from './kit-rocket'

describe('kit rocket sprite', () => {
  it('uses the pad rocket for an empty loadout and for every fitted stage', () => {
    expect(kitRocketSrc(undefined)).toBe(KIT_ROCKET_CORE)
    expect(kitRocketSrc({})).toBe(KIT_ROCKET_CORE)
    expect(kitRocketSrc({
      engine: 'ion-thruster-t1',
      booster: 'strap-booster-t1',
      cockpit: 'cockpit-command-t1',
      payload: 'mining-payload-t1',
    })).toBe(KIT_ROCKET_CORE)
  })
})
