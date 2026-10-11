import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BASE_DOCK_CONTROLS, BaseDock } from './BaseDock'

describe('BaseDock', () => {
  it('renders exactly the three controls specified by the shared HUD layout', () => {
    const markup = renderToStaticMarkup(
      <BaseDock onSwitchOperation={vi.fn()} onBuild={vi.fn()} onHub={vi.fn()} />,
    )

    expect(BASE_DOCK_CONTROLS).toEqual(['switch', 'build', 'hub'])
    expect((markup.match(/<button/g) ?? [])).toHaveLength(3)
  })
})
