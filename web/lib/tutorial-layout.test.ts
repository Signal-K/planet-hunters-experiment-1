import { describe, expect, it } from 'vitest'
import { content_rect, reserved_rect, TUTORIAL_CONTENT_TOP, TUTORIAL_RAIL } from '@/lib/tutorial-layout'

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
})
