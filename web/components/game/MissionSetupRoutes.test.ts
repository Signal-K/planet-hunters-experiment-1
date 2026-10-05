import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('R1 mission setup', () => {
  it('keeps contract selection and launch review on one surface', () => {
    const routes = read('./MissionSetupRoutes.tsx')

    expect(routes).toContain('CONTRACT → LAUNCH')
    expect(routes).toContain('data-testid="mission-launch-review"')
    expect(routes).toContain('aria-label="Change mission setup"')
    expect(routes).toContain('DESTINATION')
    expect(routes).toContain('VEHICLE')
    expect(routes).toContain("'launch-btn'")
    expect(routes).not.toContain('GalaxyMap')
    expect(routes).not.toContain('HangarAssembly')
    expect(routes).not.toContain('MOVE TO LAUNCHPAD')
    expect(routes).not.toContain('MISSION SETUP ·')
  })

  it('uses the Earth Base scene without restoring separate setup compositions', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const styles = read('./MissionSetupRoutes.module.css')

    expect(routes).toContain('HubWorldBackground')
    expect(routes).toContain('LaunchpadModules')
    expect(routes).toContain('HangarModules')
    expect(styles).toContain('.review')
    expect(styles).toContain('.inlineChoices')
    expect(styles).toContain('@media (orientation:portrait)')
    expect(styles).not.toContain('@keyframes assemble-')
    expect(styles).not.toContain('.targetMap')
    expect(styles).not.toContain('.rocketBlueprint')
  })

  it('keeps the internal setup states on the one canonical missions URL', () => {
    const gameRoute = read('../../lib/game-route.ts')

    expect(gameRoute).toContain("if (screen === 'targets' || screen === 'rocket-buy') return 'missions'")
    expect(gameRoute).toContain("if (screen === 'fab' && missionId && targetId) return 'missions'")
  })

  it('moves legacy hangar staging automatically and lets inline changes stay in setup', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const loop = read('../../lib/contexts/useGameLoop.ts')

    expect(routes).toContain("selectedVehicle?.location === 'hangar') onTransferToLaunchpad()")
    expect(loop).toContain("['targets', 'rocket-buy', 'fab'].includes(s.screen)")
    expect(loop).toContain('return rollOutToPad(reassignedState) ?? reassignedState')
  })
})
