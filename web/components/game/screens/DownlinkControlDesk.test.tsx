import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { InstrumentSignal } from '@/lib/systems/InstrumentFeedSystem'
import { DownlinkControlDesk } from './DownlinkControlDesk'

const signal: InstrumentSignal = {
  id: 'toi-1124-01',
  kind: 'transit',
  instrumentId: 'transit-telescope',
  title: 'TOI 1124.01',
  subtitle: 'TOI-1124 · TESS FIELD · S/N 8.7',
  inspectorScreen: 'galaxy',
}

describe('DownlinkControlDesk', () => {
  it('joins the queue, waveform, controls, and inspect action into one desk', () => {
    const markup = renderToStaticMarkup(<DownlinkControlDesk signals={[signal]} />)

    expect(markup).toContain('data-testid="downlink-control-desk"')
    expect(markup).toContain('DOWNLINK QUEUE')
    expect(markup).toContain('TOI 1124.01')
    expect(markup).toContain('aria-label="Signal light curve"')
    expect(markup).toContain('aria-label="Gain"')
    expect(markup).toContain('aria-label="Zoom"')
    expect(markup).toContain('aria-label="Scrub"')
    expect(markup).toContain('data-testid="instrument-signal-inspect"')
  })

  it('keeps the console present and disables inspect while the queue is empty', () => {
    const markup = renderToStaticMarkup(<DownlinkControlDesk signals={[]} />)

    expect(markup).toContain('LINKED / NO UNRESOLVED DATA')
    expect(markup).toContain('NO ACTIVE PACKET')
    expect(markup).toContain('disabled=""')
  })
})
