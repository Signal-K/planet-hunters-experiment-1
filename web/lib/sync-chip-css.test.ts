import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('sync chip accessibility floor (SSL-652)', () => {
  it('keeps the visible label at or above 14px', () => {
    const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8')
    const rule = css.match(/\.scene-chip\.sync-chip\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toMatch(/font:\s*700\s+14px\b/)
  })
})
