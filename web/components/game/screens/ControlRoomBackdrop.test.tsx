import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ControlRoomBackdrop } from './ControlRoomBackdrop'

describe('ControlRoomBackdrop', () => {
  it('frames the courtyard composition inside a command-deck window', () => {
    const markup = renderToStaticMarkup(<ControlRoomBackdrop />)

    expect(markup).toContain('data-testid="control-room-backdrop"')
    expect(markup).toContain('data-courtyard-plate="day"')
    expect(markup).toContain('/game/assets/scenes/instrument-hub/courtyard-day.webp')
    expect(markup).toContain('COURTYARD / EARTH BASE')
    expect(markup).not.toContain('data-composition="earth-base-wide"')
    expect(markup).not.toContain('TESS RAW CADENCE')
  })

  it('uses a separately authored plate for night lighting', () => {
    const markup = renderToStaticMarkup(<ControlRoomBackdrop phase="night" />)
    expect(markup).toContain('data-courtyard-plate="night"')
    expect(markup).toContain('/game/assets/scenes/instrument-hub/courtyard-night.webp')
  })
})
