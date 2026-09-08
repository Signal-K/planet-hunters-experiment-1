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
})
