import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// SSL-345: the loop screens share one top meta bar (TopBar) and take their
// bottom navigation from the shell (GameChromeBars). No loop screen may mount
// its own bottom nav or a one-off header.
const LOOP_SCREENS = [
  'HubScreen', 'LaunchpadScreen', 'TransitScreen', 'MiningScreen', 'DebriefScreen',
]
const screensDir = join(__dirname, '..', 'game', 'screens')

describe('loop screens use one chrome', () => {
  it.each(LOOP_SCREENS)('%s mounts no private bottom navigation', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).not.toMatch(/bottom-tab-bar|data-testid="home-bar-|<GameChromeBars/)
    expect(source).not.toContain('debrief-hud-header"')
  })

  it.each(LOOP_SCREENS.filter(n => n !== 'HubScreen' && n !== 'TransitScreen' && n !== 'MiningScreen' && n !== 'LaunchpadScreen' && n !== 'DebriefScreen'))('%s uses the shared TopBar', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).toMatch(/<TopBar/)
  })

  // SSL-708: inside mining the only top control is the Menu button; d-pad left, FIRE right, no dock or clock.
  it('MiningScreen shows only the Menu button up top and a controller layout, with no scene title', () => {
    const source = readFileSync(join(screensDir, 'MiningScreen.tsx'), 'utf8')
    expect(source).toContain('<MiningBackButton')
    expect(source).toContain('<MiningFireButton')
    expect(source).toContain('<MiningDPad')
    expect(source).not.toMatch(/<BaseDock|<HubClockWidget|<TopBar/)
    expect(source).not.toContain('COURSE LOCKED')
    expect(source).not.toContain('LAUNCHPAD')
  })

  // SSL-645: Transit and the Launchpad are scenes (flight, pad) with only a back control. They no longer
  // mount their own dock or clock, and the Launchpad's own tests pin that. They must still not grow a
  // one-off header or a scene title.
  it.each(['TransitScreen', 'LaunchpadScreen'])('%s mounts no private dock, header or scene title', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).not.toMatch(/<BaseDock|<TopBar/)
    expect(source).not.toContain('COURSE LOCKED')
    expect(source).not.toContain('LAUNCHPAD')
  })
})
