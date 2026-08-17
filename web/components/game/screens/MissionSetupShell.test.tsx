import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  MissionSetupCard,
  MissionSetupFrame,
} from './MissionSetupShell'
import MissionSetupShell from './MissionSetupShell'

describe('mission setup layout components', () => {
  it('preserves the setup frame class and caller attributes', () => {
    const markup = renderToStaticMarkup(
      <MissionSetupFrame className="map-frame" data-testid="target-map">
        Map
      </MissionSetupFrame>,
    )

    expect(markup).toContain('class="mission-setup-frame map-frame"')
    expect(markup).toContain('data-testid="target-map"')
    expect(markup).toContain('>Map</div>')
  })

  it('owns the card scroll structure while preserving custom classes and styles', () => {
    const markup = renderToStaticMarkup(
      <MissionSetupCard
        className="summary-card"
        scrollClassName="summary-scroll"
        scrollStyle={{ gap: 14 }}
      >
        Summary
      </MissionSetupCard>,
    )

    expect(markup).toContain('class="mission-setup-card summary-card"')
    expect(markup).toContain('class="mission-setup-card-scroll summary-scroll"')
    expect(markup).toContain('style="gap:14px"')
    expect(markup).toContain('>Summary</div>')
  })

  it('allows coached target selection to reserve only the CTA footprint', () => {
    const markup = renderToStaticMarkup(
      <MissionSetupShell
        eyebrow="MISSION"
        title="Pick Target"
        onBack={() => undefined}
        hasCoach
        hideStepFooter
        contentBottom={104}
        actions={<button>Continue</button>}
      >
        Map
      </MissionSetupShell>,
    )

    expect(markup).toContain('padding-top:238px;padding-bottom:104px')
    expect(markup).toContain('>Continue</button>')
  })
})
