import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appGame = join(dirname(fileURLToPath(import.meta.url)), '../app/game/(main)')

function source(path: string): string {
  return readFileSync(join(appGame, path), 'utf8')
}

describe('game route server boundary', () => {
  it('keeps the hub and mission-history server page free of the game graph', () => {
    const page = source('[screen]/page.tsx')
    const client = source('[screen]/ScreenPageClient.tsx')
    const route = source('[screen]/ScreenRouteClient.tsx')
    const layout = source('layout.tsx')

    expect(page).toContain('generateStaticParams')
    expect(page).toContain('dynamicParams = false')
    expect(page).not.toMatch(/use client|GameScreenRouter|@\/lib\/data|@\/game-context|pixi|GameLayoutClient/)

    expect(client).toContain("ssr: false")
    expect(client).not.toMatch(/GameScreenRouter|@\/lib\/data|@\/game-context/)

    expect(route).not.toMatch(/GameScreenRouter/)
    expect(layout).toContain("ssr: false")
    expect(layout).not.toMatch(/GameScreenRouter|@\/lib\/data|@\/game-context/)
  })
})
