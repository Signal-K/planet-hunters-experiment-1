import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BASE_DOCK_CONTROLS, BASE_DOCK_GAP, BASE_DOCK_LABELS, BASE_DOCK_PADDING, BaseDock } from './BaseDock'

describe('BaseDock', () => {
  it('renders exactly the three controls specified by the shared HUD layout', () => {
    const markup = renderToStaticMarkup(
      <BaseDock onSwitchOperation={vi.fn()} onBuild={vi.fn()} onHub={vi.fn()} />,
    )

    const nav = JSON.parse(readFileSync(join(process.cwd(), '../shared/layout/base-hud-zones.json'), 'utf8')).zones['bottom-nav']
    expect([...BASE_DOCK_CONTROLS]).toEqual(nav.tiles)
    expect(BASE_DOCK_GAP).toBe(nav.gap)
    expect(BASE_DOCK_PADDING).toBe(nav.padding)
    expect(BASE_DOCK_LABELS).toEqual(['« »', 'Build', 'Hub'])
    expect((markup.match(/<button/g) ?? [])).toHaveLength(3)
    expect(markup).toContain('« »')
    expect(markup).toContain('>Build<')
    expect(markup).toContain('>Hub<')
  })
})
