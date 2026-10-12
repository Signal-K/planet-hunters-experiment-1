import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// SSL-345: the loop screens share one top meta bar (TopBar) and take their
// bottom navigation from the shell (GameChromeBars). No loop screen may mount
// its own bottom nav or a one-off header.
const LOOP_SCREENS = [
  'HubScreen', 'LaunchpadScreen', 'TransitScreen', 'MiningScreen', 'DebriefScreen', 'BuildPlaceScreen',
]
const screensDir = join(__dirname, '..', 'game', 'screens')

describe('loop screens use one chrome', () => {
  it.each(LOOP_SCREENS)('%s mounts no private bottom navigation', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).not.toMatch(/bottom-tab-bar|data-testid="home-bar-|<GameChromeBars/)
    expect(source).not.toContain('debrief-hud-header"')
  })

  it.each(LOOP_SCREENS.filter(n => n !== 'HubScreen' && n !== 'TransitScreen' && n !== 'MiningScreen' && n !== 'LaunchpadScreen'))('%s uses the shared TopBar', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).toMatch(/<TopBar/)
  })

  it.each(['TransitScreen', 'MiningScreen', 'LaunchpadScreen'])('%s uses the shared base dock and clock, with no scene title', name => {
    const source = readFileSync(join(screensDir, `${name}.tsx`), 'utf8')
    expect(source).toContain('<BaseDock')
    expect(source).toContain('<HubClockWidget')
    expect(source).not.toMatch(/<TopBar/)
    expect(source).not.toContain('COURSE LOCKED')
    expect(source).not.toContain('LAUNCHPAD')
  })
})
