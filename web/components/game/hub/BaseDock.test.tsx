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

  it('turns the location Build action into an explicit Done control', () => {
    const markup = renderToStaticMarkup(
      <BaseDock
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onBuild={vi.fn()}
        onHub={vi.fn()}
        locationLabel="Earth"
        buildLabel="Done"
        buildTestId="hub-build-done-btn"
      />,
    )

    expect(markup).toContain('data-testid="hub-build-done-btn"')
    expect(markup).toContain('>Done<')
  })

  it('keeps the location selector labelled and exposes Menu as a compact utility action', () => {
    const markup = renderToStaticMarkup(
      <BaseDock
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onBuild={vi.fn()}
        onHub={vi.fn()}
        locationLabel="Earth"
        locationNavigationDisabled
      />,
    )

    expect(markup).toContain('aria-label="Selected location Earth"')
    expect(markup).toContain('aria-label="Previous location"')
    expect(markup).toContain('aria-label="Next location"')
    expect(markup).toContain('data-testid="hub-btn"')
    expect(markup).toContain('>Menu<')
  })

  it('sizes the compact location action grid to the controls that are actually rendered', () => {
    const threeActions = renderToStaticMarkup(
      <BaseDock onPrev={vi.fn()} onNext={vi.fn()} onBuild={vi.fn()} onHub={vi.fn()} onSubsurface={vi.fn()} locationLabel="Earth" />,
    )
    const fourActions = renderToStaticMarkup(
      <BaseDock onPrev={vi.fn()} onNext={vi.fn()} onBuild={vi.fn()} onHub={vi.fn()} onSubsurface={vi.fn()} onMission={vi.fn()} locationLabel="Earth" />,
    )

    expect(threeActions).toContain('data-action-count="3"')
    expect(fourActions).toContain('data-action-count="4"')
  })
})
