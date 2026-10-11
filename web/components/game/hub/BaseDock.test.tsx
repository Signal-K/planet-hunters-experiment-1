import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BASE_DOCK_CONTROLS, BASE_DOCK_GAP, BASE_DOCK_PADDING, BaseDock } from './BaseDock'

describe('BaseDock', () => {
  it('renders previous, Build, Hub and next across the floating dock', () => {
    const markup = renderToStaticMarkup(
      <BaseDock onPrev={vi.fn()} onNext={vi.fn()} onBuild={vi.fn()} onHub={vi.fn()} />,
    )

    const nav = JSON.parse(readFileSync(join(process.cwd(), '../shared/layout/base-hud-zones.json'), 'utf8')).zones['bottom-nav']
    expect([...BASE_DOCK_CONTROLS]).toEqual(nav.tiles)
    expect(BASE_DOCK_GAP).toBe(nav.gap)
    expect(BASE_DOCK_PADDING).toBe(nav.padding)
    expect((markup.match(/<button/g) ?? [])).toHaveLength(4)
    expect(markup).toContain('>Build<')
    expect(markup).toContain('>Hub<')
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
    expect(markup).not.toContain('Base')
  })
})
