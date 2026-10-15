import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('R1 mission setup', () => {
  it('keeps contract selection and launch review on one surface', () => {
    const routes = read('./MissionSetupRoutes.tsx')

    expect(routes).not.toContain('CONTRACT → LAUNCH')
    expect(routes).toContain('data-testid="mission-launch-review"')
    expect(routes).toContain('LaunchpadScreen')
    expect(routes).toContain('confirmShipCustomizerBuild')
    expect(routes).toContain("'launch-btn'")
    // The rocket builder is the launch review. The full target-picker screen is not.
    expect(routes).not.toContain('TargetPickerScreen')
    expect(routes).not.toContain('HangarAssembly')
    expect(routes).not.toContain('MOVE TO LAUNCHPAD')
    expect(routes).not.toContain('MISSION SETUP ·')
  })

  it('uses the rocket builder scene without restoring separate setup compositions', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const builder = read('./screens/RocketBuilderScene.tsx')
    const styles = read('./MissionSetupRoutes.module.css')

    expect(routes).toContain('LaunchpadScreen')
    expect(builder).toContain('launchpad-rocket-multistage.png')
    expect(builder).toContain('builderLandscape')
    expect(styles).toContain('.review')
    expect(styles).toContain('.inlineChoices')
    expect(styles).toContain('@media (orientation:portrait)')
    expect(styles).not.toContain('@keyframes assemble-')
    expect(styles).not.toContain('.targetMap')
    expect(styles).not.toContain('.rocketBlueprint')
  })

  it('renders the mission board instead of the contract carousel', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const styles = read('./MissionSetupRoutes.module.css')
    const board = read('./MissionBoard.tsx')

    expect(routes).toContain('<MissionBoard')
    expect(routes).toContain("id === ACADEMY_INTRO_MISSION_ID ? game.go('academy')")
    expect(routes).not.toContain('Choose a contract')
    expect(routes).not.toContain('contractGallery')
    expect(styles).not.toContain('.contractGallery')
    expect(board).toContain('mission-board-tab-contracts')
    expect(board).toContain('mission-board-tab-program')
    expect(board).toContain('mission-board-tab-events')
    expect(board).toContain('mission-accept-')
  })

  it('keeps the Mission Board back control at the 44px touch-target floor', () => {
    const styles = read('./MissionSetupRoutes.module.css')

    expect(styles).toMatch(/\.back\s*\{[^}]*min-width:44px;[^}]*min-height:44px;/)
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
