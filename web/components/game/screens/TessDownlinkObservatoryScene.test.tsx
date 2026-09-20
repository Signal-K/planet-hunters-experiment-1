import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TessDownlinkObservatoryScene } from './TessDownlinkObservatoryScene'

describe('TessDownlinkObservatoryScene', () => {
  it('renders a raw TESS cadence scene rather than an Earth Base backdrop', () => {
    const markup = renderToStaticMarkup(
      <TessDownlinkObservatoryScene transitOnline deepSpaceOnline readyCount={2} />,
    )

    expect(markup).toContain('data-testid="tess-downlink-observatory-scene"')
    expect(markup).toContain('TESS RAW CADENCE / FLUX SAMPLE')
    expect(markup).toContain('CADENCE 120S')
    expect(markup).toContain('2 READY')
    expect(markup).not.toContain('hub-terrain-fallback')
    expect(markup).not.toContain('earth-base-wide')
  })

  it('labels an unlaunched receiver without inventing an orbital link', () => {
    const markup = renderToStaticMarkup(
      <TessDownlinkObservatoryScene transitOnline={false} deepSpaceOnline={false} readyCount={0} />,
    )

    expect(markup).toContain('RECEIVER STANDBY')
    expect(markup).toContain('SYNCED')
  })
})
