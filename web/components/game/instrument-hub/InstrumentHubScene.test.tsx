import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InstrumentHubScene } from './InstrumentHubScene'
import { INSTRUMENT_HUB_ASSETS } from './hub-chrome-layout'

describe('InstrumentHubScene', () => {
  it('renders plate-j art and interactive mounts', () => {
    const markup = renderToStaticMarkup(
      <InstrumentHubScene
        classify={<div data-testid="classify-slot">Classify</div>}
        queue={<div data-testid="queue-slot">Queue</div>}
        controls={<div data-testid="controls-slot">Controls</div>}
      />,
    )

    expect(markup).toContain('data-testid="instrument-hub-scene"')
    expect(markup).toContain('data-testid="classify-slot"')
    expect(markup).toContain('data-testid="queue-slot"')
    expect(markup).toContain('data-testid="controls-slot"')
    expect(markup).toContain(INSTRUMENT_HUB_ASSETS.plate)
    expect(markup).toContain(INSTRUMENT_HUB_ASSETS.warmWindow)
  })
})
