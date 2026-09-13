import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('mission setup replacement boundary', () => {
  it('keeps the four setup states in one fixed Earth Base stage', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const styles = read('./MissionSetupRoutes.module.css')

    expect(routes).toContain("Extract<Screen, 'missions' | 'targets' | 'rocket-buy' | 'fab'>")
    expect(routes).toContain('data-testid="mission-setup-scaffold"')
    expect(routes).toContain('data-testid="mission-setup-landscape"')
    expect(routes).toContain('data-testid="mission-setup-stage"')
    expect(routes).toContain('HubWorldBackground')
    expect(routes).toContain('LaunchpadModules')
    expect(routes).toContain('HangarModules')
    expect(routes).toContain('ClientMark')
    expect(routes).toContain('RequiredCargo')
    expect(routes).toContain('GalaxyMap')
    expect(routes).toContain('selectedRocket.img')
    expect(routes).toContain('MISSION REVIEW')
    expect(styles).toMatch(/\.stage\s*\{[\s\S]*?inset:\s*96px 32px 32px/)
    expect(styles).toMatch(/\.contractGallery,[\s\S]*\.missionReview\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/)
    expect(routes).not.toMatch(/MissionSetupShell|MissionBoardScreen|TargetPickerScreen|RocketPurchaseScreen|AssemblyScreen/)
    expect(routes).not.toMatch(/MissionSceneBackdrop|mission-relay-yard|rocket-inspection-bay|launch-clearance-panel|visual layer removed/)
  })

  it('implements the four full-stage compositions rather than a panel dashboard', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const styles = read('./MissionSetupRoutes.module.css')

    expect(routes).not.toContain('theme-deep')
    expect(styles).toContain('.landscape')
    expect(styles).toContain('.contractGallery')
    expect(styles).toContain('.targetMap')
    expect(styles).toContain('.rocketBlueprint')
    expect(styles).toContain('.missionReview')
    expect(routes).toContain('relay.selectRelativeSignal(-1)')
    expect(routes).toContain('relay.selectRelativeSignal(1)')
    expect(routes).toContain('ONLY TARGETS WITH THE REQUIRED MINERALS, RANGE, CARGO, AND DRILL PARAMETERS ARE HIGHLIGHTED.')
    expect(routes).toContain('eligibleOnlyHighlight')
    expect(routes).toContain('selectableRockets.length > 1')
    expect(routes).toContain('selectedRooms')
    expect(routes).toContain('ALTERNATE ROOMS NOT YET AVAILABLE')
    expect(routes).toContain('CURRENT AFFINITY')
    expect(routes).toContain('DESTINATION CLASS')
    expect(routes).toContain('targetTypeLabel(game.target.type)')
    expect(styles).toContain('.cargoChip')
    expect(routes).toContain('BUILD EXPLORER · ₣0')
    expect(routes).toContain('MOVE TO LAUNCHPAD')
    expect(routes).toContain('MOVE VEHICLE TO THIS MISSION')
    expect(routes).toContain('data-testid="hangar-assembly-animation"')
    expect(routes).toContain('ASSEMBLY IN PROGRESS')
    expect(routes).toContain('REPLAY ASSEMBLY')
    expect(routes).toContain('COMPANY SHIPMENT')
    expect(styles).toContain('@keyframes assemble-aft')
    expect(styles).toContain('@keyframes assemble-stage')
    expect(styles).toContain('@keyframes assemble-payload')
    expect(styles).toContain('@keyframes inspect-vehicle')
    expect(styles).toContain('.reviewBrief')
    expect(styles).toContain('@media (orientation: portrait) {')
    expect(styles).toContain('height: clamp(220px, 31%, 300px)')
    expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(styles).toContain('.reviewFacts > div:nth-child(3) { display: block; }')
    expect(styles).toContain('.purchaseTerms')
    expect(styles).toContain(".root[data-step='1'][data-coach='true'] .contractIdentity")
    expect(styles).toContain(".root[data-step='2'][data-coach='true'] .filterRibbon")
    expect(styles).toContain(".root[data-step='4'][data-coach='true'] .hangarBayHeading")
  })

  it('keeps Hub mobile chrome and scene objects in non-overlapping zones', () => {
    const globals = read('../../app/globals.css')
    const hub = read('./screens/HubScreen.tsx')
    const structures = read('../../app/launchpad-screen.css')

    expect(hub).toContain('data-screen="hub"')
    expect(hub).toContain('left: `clamp(62px,')
    expect(globals).toContain('.portrait-canvas:has([data-screen="hub"]) .hub-friends-button')
    expect(globals).toContain('.portrait-canvas:has([data-screen="hub"]) .feedback-launcher')
    expect(globals).toContain('bottom: auto !important')
    expect(structures).toContain('.portrait-canvas:has([data-screen="hub"]) .earth-base-flat-sprite')
  })

  it('keeps the mission coach at one fixed width and anchor', () => {
    const coach = read('./TutorialCoach.tsx')
    const globals = read('../../app/globals.css')

    expect(coach).toContain("left: 16, top: TUTORIAL_RAIL.RESERVED_TOP, width: 320")
    expect(coach).toContain('tutorial-coach-overlay tutorial-coach-overlay--mission-setup')
    expect(globals).toContain('.tutorial-coach-overlay:not(.tutorial-coach-overlay--mission-setup)')
  })

  it('retains the state-transition actions needed by a replacement component set', () => {
    const routes = read('./MissionSetupRoutes.tsx')

    expect(routes).toContain('game.onPickMission')
    expect(routes).toContain('game.onPickTarget')
    expect(routes).toContain('game.onPurchaseRocket')
    expect(routes).toContain('game.onMoveStagedRocket')
    expect(routes).toContain('validateBuild')
    expect(routes).toContain('onLaunch')
  })

  it('keeps setup state on the single canonical missions URL', () => {
    const gameRoute = read('../../lib/game-route.ts')

    expect(gameRoute).toContain("if (screen === 'targets' || screen === 'rocket-buy') return 'missions'")
    expect(gameRoute).toContain("if (screen === 'fab' && missionId && targetId) return 'missions'")
  })
})
