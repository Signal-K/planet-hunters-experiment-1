import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { SHIP_ROOM_ASSETS, SHIP_ROOM_DETAIL_ASSETS } from './shipRooms'

describe('ship room art', () => {
  it('uses a dedicated booster sprite instead of mining-room art', () => {
    expect(SHIP_ROOM_ASSETS.booster).toBe('/game/assets/rooms/booster_t1_icon.png')
    expect(SHIP_ROOM_DETAIL_ASSETS.booster).toBe('/game/assets/rooms/booster_t1.png')
    expect(existsSync(join(process.cwd(), 'public', SHIP_ROOM_ASSETS.booster))).toBe(true)
    expect(existsSync(join(process.cwd(), 'public', SHIP_ROOM_DETAIL_ASSETS.booster))).toBe(true)
  })
})
