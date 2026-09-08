import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('mission setup ownership', () => {
  it('keeps one route-level shell and background instead of mounting them per step', () => {
    const routes = read('./MissionSetupRoutes.tsx')
    const stepFiles = [
      './screens/MissionBoardScreen.tsx',
      './screens/TargetPickerScreen.tsx',
      './screens/RocketPurchaseScreen.tsx',
      './screens/AssemblyScreen.tsx',
    ].map(read)

    expect(routes.match(/<MissionSetupShell\b/g)).toHaveLength(1)
    expect(routes.match(/<MissionSceneBackdrop\b/g)).toHaveLength(1)
    for (const step of stepFiles) {
      expect(step).not.toMatch(/<MissionSetupShell\b/)
      expect(step).not.toMatch(/sceneBackground=/)
      expect(step).toMatch(/<MissionSetupStep\b/)
    }
  })

  it('renders the game tree from the persistent route layout', () => {
    const layout = read('../../app/game/(main)/layout.tsx')
    const routePage = read('../../app/game/(main)/[screen]/page.tsx')

    expect(layout).toMatch(/<ScreenContent\s+screen=\{game\.screen\}/)
    expect(routePage).not.toMatch(/<ScreenContent\b/)
  })

  it('keeps target and rocket visuals full-stage with attached, non-scrolling inspectors', () => {
    const shellStyles = read('./screens/MissionSetupShell.module.css')
    const rocket = read('./screens/RocketPurchaseScreen.tsx')

    expect(shellStyles).toMatch(/mission-setup-screen--target[\s\S]*target-map-frame[\s\S]*height:\s*100%\s*!important/)
    expect(shellStyles).toMatch(/mission-setup-screen--target[\s\S]*mission-board-detail[\s\S]*position:\s*absolute/)
    expect(shellStyles).toMatch(/mission-setup-screen--rocket[\s\S]*rocket-vehicle-frame[\s\S]*width:\s*100%\s*!important/)
    expect(shellStyles).toMatch(/mission-setup-screen--rocket[\s\S]*rocket-summary-card[\s\S]*position:\s*absolute/)
    expect(shellStyles).toMatch(/rocket-summary-scroll[\s\S]*overflow:\s*hidden\s*!important/)
    expect(rocket).toMatch(/useState\(false\)/)
  })

  it('uses explicit client cycling and mission-selection language', () => {
    const relay = read('./MissionRelayCard.tsx')
    const tutorial = read('../../lib/data/tutorial.ts')

    expect(relay).toContain('Previous client')
    expect(relay).toContain('Next client')
    expect(relay).toContain('Select mission ·')
    expect(relay).not.toContain('Lock contract ·')
    expect(tutorial).toContain("title: 'Select a Mission'")
  })
})
