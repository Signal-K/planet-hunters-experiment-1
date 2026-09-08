import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import MissionSetupShell from './MissionSetupShell'

describe('MissionSetupShell', () => {
  it('owns one shared content frame, body, and non-overlaid action row', () => {
    const markup = renderToStaticMarkup(
      <MissionSetupShell
        eyebrow="LAUNCHPAD · TEST"
        title="Mission setup"
        onBack={vi.fn()}
        hasCoach
        sceneBackground={<div data-testid="test-scene" />}
        actions={<button type="button">Continue</button>}
      >
        <div data-testid="test-step">Step content</div>
      </MissionSetupShell>,
    )

    expect(markup.match(/data-mission-setup-shell="true"/g)).toHaveLength(1)
    expect(markup.match(/data-testid="mission-creator-container"/g)).toHaveLength(1)
    expect(markup.match(/mission-creator-body/g)).toHaveLength(1)
    expect(markup.match(/mission-creator-actions/g)).toHaveLength(1)
    expect(markup).toContain('mission-setup-screen--coached')
    expect(markup).toContain('data-ui-zone="screen-content"')
    expect(markup).toContain('data-ui-zone="bottom-actions"')
  })
})
