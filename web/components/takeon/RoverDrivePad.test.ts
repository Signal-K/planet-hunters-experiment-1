import { describe, expect, it } from 'vitest'
import { driveButtons, driveStatus, viewToggleLabel } from './RoverDrivePad'

describe('RoverDrivePad', () => {
  it('reads as a compass rose on the flat map and as diagonals in the diorama', () => {
    expect(driveButtons('flat').map(b => b.label)).toEqual(['UP', 'LEFT', 'RIGHT', 'DOWN'])
    expect(driveButtons('iso').map(b => b.label)).toEqual(['NE', 'NW', 'SE', 'SW'])
    // Engine directions are fixed (0 SE/right, 1 SW/down, 2 NW/left, 3 NE/up).
    expect(driveButtons('flat').find(b => b.slot === 'up')?.dir).toBe(3)
    expect(driveButtons('flat').find(b => b.slot === 'right')?.dir).toBe(0)
    expect(driveButtons(null)).toEqual(driveButtons('flat'))
  })

  it('says where the rover is going and how to stop', () => {
    expect(driveStatus(null, 0)).toBe('IDLE · TAP A TILE OR USE THE PAD')
    expect(driveStatus(null, 4)).toBe('4 SAFE STEPS PLANNED')
    expect(driveStatus({ type: 'goto', pos: { x: 12, y: 4 } }, 6)).toBe('DRIVING TO 12, 4 · 6 STEPS LEFT')
    expect(driveStatus({ type: 'mine', pos: { x: 2, y: 9 } }, 1)).toBe('DRIVING TO MINE · 2, 9')
  })

  it('explains a refused press and otherwise reports the rover pose', () => {
    const parked = { x: 7, y: 3, moving: false, battery: 1 }
    expect(driveStatus(null, 0, parked)).toBe('PARKED AT 7, 3 · TAP A TILE OR USE THE PAD')
    expect(driveStatus(null, 0, { ...parked, moving: true })).toBe('MOVING · 7, 3')
    expect(driveStatus(null, 0, parked, 'cliff')).toBe('BLOCKED · TOO STEEP THAT WAY')
    // A blocked reason outranks an order so the player learns why nothing happened.
    expect(driveStatus({ type: 'goto', pos: { x: 1, y: 1 } }, 2, parked, 'edge')).toBe('BLOCKED · EDGE OF THE FIELD')
  })

  it('labels the view toggle with the view it switches to', () => {
    expect(viewToggleLabel('flat')).toBe('DIORAMA VIEW')
    expect(viewToggleLabel('iso')).toBe('MAP VIEW')
  })
})
