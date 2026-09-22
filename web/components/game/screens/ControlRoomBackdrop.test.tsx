import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ControlRoomBackdrop } from './ControlRoomBackdrop'

describe('ControlRoomBackdrop', () => {
  it('frames the courtyard composition inside a command-deck window', () => {
    const markup = renderToStaticMarkup(<ControlRoomBackdrop />)

    expect(markup).toContain('data-testid="control-room-backdrop"')
    expect(markup).toContain('data-composition="earth-base-courtyard"')
    expect(markup).toContain('COURTYARD / EARTH BASE')
    expect(markup).toContain('hangar_flat.png')
    expect(markup).not.toContain('data-composition="earth-base-wide"')
    expect(markup).not.toContain('TESS RAW CADENCE')
  })

  it('can hide the hangar overlay for the empty-window comparison', () => {
    const markup = renderToStaticMarkup(<ControlRoomBackdrop showHangar={false} />)
    expect(markup).not.toContain('hangar_flat.png')
  })
})
