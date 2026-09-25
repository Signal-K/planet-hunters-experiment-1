// Rendered by tools/blender/models/actors.py. Keep this source explicit: the
// rover scene is a production consumer of the authored asset, not a second
// hand-drawn rover design.
export const ROVER_SPRITE_SRC = '/game/assets/actors/rover.png'
export const ROVER_SPRITE_SCALE = 1 / 3

export function roverSpritePlacement(x: number, y: number, speed: number, elapsed: number) {
  const moving = Math.abs(speed) > 0.05
  const bob = moving ? Math.sin(elapsed * 8 + x * 0.05) * 1.5 : 0
  return {
    x,
    y: y + 14 + bob,
    scaleX: (speed < -0.05 ? -1 : 1) * ROVER_SPRITE_SCALE,
    scaleY: ROVER_SPRITE_SCALE,
  }
}
