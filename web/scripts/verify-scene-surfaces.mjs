import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const screensDirectory = join(scriptDirectory, '..', 'components', 'game', 'screens')
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.name.endsWith('.tsx') ? [path] : []
  })
}

const violations = []
for (const path of sourceFiles(screensDirectory)) {
  const source = readFileSync(path, 'utf8')
  const file = path.slice(screensDirectory.length + 1)
  if (source.includes('theme-blueprint')) {
    violations.push(`${file}: gameplay screens must use the scene-panel/deep surface, never theme-blueprint.`)
  }
  if (source.includes('AvailableActionsPanel')) {
    violations.push(`${file}: do not add a generic AvailableActionsPanel; gameplay must keep one contextual action surface.`)
  }
  if (!file.endsWith('.test.tsx') && usesPanelWithoutAScene(source)) {
    violations.push(`${file}: renders Panel cards with no scene backdrop (ScenePanel/HubWorldBackground/TerrainScene/a *Canvas component) — see KES-289. Wrap content in <ScenePanel> instead of a flat --ln-panel/--ln-bg fill.`)
  }
}

// Heuristic for the "cards on a blank screen" anti-pattern (KES-289): a
// screen that renders the shared Panel card component but has no scene
// layer anywhere reads as a dashboard, not a game. This only catches
// screens using the shared Panel component — it is not exhaustive.
function usesPanelWithoutAScene(source) {
  const usesPanel = /from ['"]@\/components\/ui\/Panel['"]/.test(source)
  if (!usesPanel) return false
  const hasScene = /ScenePanel|ln-scene-|HubWorldBackground|TerrainScene|Canvas/.test(source)
  return !hasScene
}

if (violations.length > 0) {
  console.error('Scene-surface policy failed:\n' + violations.map(issue => `- ${issue}`).join('\n'))
  process.exit(1)
}

console.log('Scene-surface policy passed.')
