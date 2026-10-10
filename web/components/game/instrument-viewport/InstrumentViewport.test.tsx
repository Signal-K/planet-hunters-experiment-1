import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import InstrumentViewport, { InstrumentAnswerRow, InstrumentToolButton } from './InstrumentViewport'

const shell = {
  testId: 'instrument-preview',
  sceneClassName: 'ln-scene-tess-discovery',
  eyebrow: 'INSTRUMENT DATA FEED · DAILY DOWNLINK',
  title: 'SUBJECT',
  onBack: () => {},
  status: 'REVIEW',
}

describe('shared instrument viewport', () => {
  it('renders one console and swaps only the answer row and tool', () => {
    const tess = renderToStaticMarkup(
      <InstrumentViewport
        {...shell}
        viewport={<div data-testid="light-curve">curve</div>}
        answers={<InstrumentAnswerRow coachTarget="tess-verdicts" actions={[
          { id: 'planet', label: 'Confirm Transit', testId: 'tess-verdict-planet', onClick: () => {} },
          { id: 'not_planet', label: 'Mark Noise', testId: 'tess-verdict-not_planet', onClick: () => {} },
          { id: 'unsure', label: 'Skip', testId: 'tess-verdict-unsure', onClick: () => {} },
        ]} />}
        tool={<InstrumentToolButton testId="tess-drag-dip" label="Drag dip" onClick={() => {}} />}
      />,
    )
    const asteroids = renderToStaticMarkup(
      <InstrumentViewport
        {...shell}
        testId="asteroid-preview"
        viewport={<div data-testid="ra-dec">chart</div>}
        answers={<InstrumentAnswerRow actions={[
          { id: 'likely_real', label: 'Flag Likely Real', testId: 'neocp-verdict-likely_real', onClick: () => {} },
          { id: 'likely_artifact', label: 'Mark Artifact', testId: 'neocp-verdict-likely_artifact', onClick: () => {} },
          { id: 'unsure', label: 'Skip', testId: 'neocp-verdict-unsure', onClick: () => {} },
        ]} />}
        emptyToolLabel="No tool"
      />,
    )
    const saturn = renderToStaticMarkup(
      <InstrumentViewport
        {...shell}
        testId="saturn-preview"
        viewport={<div data-testid="cassini-frame">frame</div>}
        overlay={<div data-testid="saturn-grid">grid</div>}
        answers={<InstrumentAnswerRow actions={[
          { id: 'yes', label: 'Yes', testId: 'saturn-verdict-yes', onClick: () => {} },
          { id: 'no', label: 'No', testId: 'saturn-verdict-no', onClick: () => {} },
          { id: 'maybe', label: 'Maybe', testId: 'saturn-verdict-maybe', onClick: () => {} },
        ]} />}
        tool={<InstrumentToolButton testId="saturn-mark-storm" label="Mark storm" onClick={() => {}} />}
      />,
    )

    for (const markup of [tess, asteroids, saturn]) {
      expect(markup).toContain('data-testid="instrument-controls"')
      expect(markup).toContain('data-testid="instrument-viewport"')
      expect(markup).toContain('data-testid="instrument-command-input"')
      expect(markup).toContain('AIM')
      expect(markup).toContain('ZOOM')
      expect(markup).toContain('EXPOSURE')
    }
    expect(tess).toContain('Confirm Transit')
    expect(tess).toContain('Drag dip')
    expect(tess).not.toContain('No tool')
    expect(asteroids).toContain('Flag Likely Real')
    expect(asteroids).toContain('No tool')
    expect(asteroids).not.toContain('Drag dip')
    expect(saturn).toContain('Mark storm')
    expect(saturn).toContain('data-testid="saturn-grid"')
    expect(tess).toContain('data-coach-target="tess-verdicts"')
  })
})
