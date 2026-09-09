import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('mission setup replacement boundary', () => {
  it('keeps the four setup states in one visual mission-control console', () => {
    const routes = read('./MissionSetupRoutes.tsx')

    expect(routes).toContain("Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>")
    expect(routes).toContain('data-testid="mission-setup-scaffold"')
    expect(routes).toContain('ClientMark')
    expect(routes).toContain('MineralChip')
    expect(routes).toContain('GalaxyMap')
    expect(routes).toContain('selectedRocket.img')
    expect(routes).toContain('FLIGHT MANIFEST')
    expect(routes).not.toMatch(/MissionSetupShell|MissionBoardScreen|TargetPickerScreen|RocketPurchaseScreen|AssemblyScreen/)
    expect(routes).not.toMatch(/MissionSceneBackdrop|mission-relay-yard|rocket-inspection-bay|launch-clearance-panel|visual layer removed/)
  })

  it('retains the state-transition actions needed by a replacement component set', () => {
    const routes = read('./MissionSetupRoutes.tsx')

    expect(routes).toContain('game.onPickMission')
    expect(routes).toContain('game.onPickTarget')
    expect(routes).toContain('game.onPurchaseRocket')
    expect(routes).toContain('game.onFabricateRocketPart')
    expect(routes).toContain('game.onAssembleFabricatedRocket')
    expect(routes).toContain('validateBuild')
    expect(routes).toContain('onLaunch')
  })

  it('keeps setup state on the single canonical missions URL', () => {
    const gameRoute = read('../../lib/game-route.ts')

    expect(gameRoute).toContain("if (screen === 'targets' || screen === 'rocket-buy') return 'missions'")
    expect(gameRoute).toContain("if (screen === 'fab' && missionId && targetId) return 'missions'")
  })
})
