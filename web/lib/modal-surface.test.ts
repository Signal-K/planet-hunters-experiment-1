import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'components')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

describe('non-modal gameplay surfaces', () => {
  it('does not ship the retired shared modal primitives or dialog semantics', () => {
    expect(existsSync(join(ROOT, 'ui', 'Sheet.tsx'))).toBe(false)
    expect(existsSync(join(ROOT, 'game', 'ConfirmActionSheet.tsx'))).toBe(false)

    const violations = sourceFiles(ROOT).flatMap(path => {
      const source = readFileSync(path, 'utf8')
      return [
        source.includes('aria-modal') && `${path}: aria-modal`,
        /role=["'](?:dialog|alertdialog)["']/.test(source) && `${path}: dialog role`,
        source.includes('UI_ZONES.modalOverlay') && `${path}: modal overlay zone`,
      ].filter((value): value is string => typeof value === 'string')
    })

    expect(violations).toEqual([])
  })
})
