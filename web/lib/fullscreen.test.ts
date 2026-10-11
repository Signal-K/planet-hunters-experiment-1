import { describe, expect, it } from 'vitest'
import { canOfferFullscreen } from './fullscreen'

const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36'
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const base = { userAgent: android, fullscreenEnabled: true, landscape: true, active: false }

describe('canOfferFullscreen', () => {
  it('offers on Android landscape when the API exists', () => {
    expect(canOfferFullscreen(base)).toBe(true)
  })
  it('hides on iPhone Safari', () => {
    expect(canOfferFullscreen({ ...base, userAgent: iphone, fullscreenEnabled: false })).toBe(false)
  })
  it('hides without the Fullscreen API, in portrait, or when already fullscreen', () => {
    expect(canOfferFullscreen({ ...base, fullscreenEnabled: false })).toBe(false)
    expect(canOfferFullscreen({ ...base, landscape: false })).toBe(false)
    expect(canOfferFullscreen({ ...base, active: true })).toBe(false)
  })
})
