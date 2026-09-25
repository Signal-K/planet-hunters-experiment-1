import { describe, expect, it } from 'vitest'
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_DESCRIPTOR,
  PRODUCT_NAME,
  PRODUCT_OPERATIONS_LABEL,
  PRODUCT_WORDMARK,
} from './brand'

describe('player-facing brand', () => {
  it('describes the wider space-program loop', () => {
    expect(PRODUCT_NAME).toBe('Landnam: Space Program')
    expect(PRODUCT_WORDMARK).toBe('LANDNAM')
    expect(PRODUCT_DESCRIPTOR).toBe('SPACE PROGRAM')
    expect(PRODUCT_OPERATIONS_LABEL).toBe('SPACE PROGRAM OPERATIONS')
    expect(PRODUCT_DESCRIPTION).toContain('launches, logistics, discovery, and settlement building')
  })
})
