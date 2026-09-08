import { describe, expect, it } from 'vitest'
import { content_rect, reserved_rect, TUTORIAL_CONTENT_TOP, TUTORIAL_RAIL } from '@/lib/tutorial-layout'
import { M1_STEPS } from '@/lib/data/tutorial'

describe('tutorial layout rail', () => {
  it('reserves the same dedicated top rail for every coach anchor', () => {
    expect(reserved_rect('top')).toEqual({
      top: TUTORIAL_RAIL.RESERVED_TOP,
      height: TUTORIAL_RAIL.RESERVED_HEIGHT,
    })
    expect(reserved_rect('bottom')).toEqual(reserved_rect('top'))
  })

  it('keeps interactive content below the tutorial rail', () => {
    const rect = content_rect('bottom', 874)

    expect(rect.top).toBe(TUTORIAL_CONTENT_TOP)
    expect(rect.top).toBeGreaterThan(
      TUTORIAL_RAIL.RESERVED_TOP + TUTORIAL_RAIL.RESERVED_HEIGHT
    )
    expect(rect.bottom).toBe(874 - TUTORIAL_RAIL.BOTTOM_PILL_Y)
  })

  it('reserves enough height for a real two-line-wrapped coach card (KES-146)', () => {
    // At the 390px mobile viewport, the "Lock a Contract" step's body copy
    // wraps to two lines and measured 134px tall in practice — the old 84px
    // estimate undershot that by 50px, which let scrollIntoView tuck list
    // items under the coach overlay. Guard against silently shrinking this
    // back below the worst measured height.
    const MEASURED_TWO_LINE_CARD_HEIGHT = 134
    expect(TUTORIAL_RAIL.RESERVED_HEIGHT).toBeGreaterThanOrEqual(MEASURED_TWO_LINE_CARD_HEIGHT)
  })

  it('coaches every mission setup step inside the shared frame (KES-347)', () => {
    const coachedSetupScreens = new Set(
      M1_STEPS
        .filter(step => ['missions', 'targets', 'rocket-buy', 'fab'].includes(step.screen))
        .map(step => step.screen),
    )

    expect(coachedSetupScreens).toEqual(new Set(['missions', 'targets', 'rocket-buy', 'fab']))
  })
})
