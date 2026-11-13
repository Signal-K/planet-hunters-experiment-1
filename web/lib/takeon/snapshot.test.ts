import { describe, expect, it } from 'vitest'
import { encodeCoreSnapshot, decodeCoreSnapshot } from './snapshot'
describe('portable Go snapshot wire format', () => {
  it('round-trips Unicode body content using native-compatible base64', () => {
    const raw = JSON.stringify({ v: 1, bodyId: 'moon', rover: {}, caption: 'Landnám — 月' })
    expect(decodeCoreSnapshot(encodeCoreSnapshot(raw))).toBe(raw)
    expect(Buffer.from(encodeCoreSnapshot(raw), 'base64').toString('utf8')).toBe(raw)
  })
  it('leaves malformed and older non-Go saves on the legacy resume path', () => {
    for (const value of [null, '', '!', btoa('{}'), btoa('{"v":2,"bodyId":"moon","rover":{}}')]) {
      expect(decodeCoreSnapshot(value)).toBeUndefined()
    }
  })
})
