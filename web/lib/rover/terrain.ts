/** Side-view survey terrain. Elevation is in pixels, positive up. The rover integrates against this heightmap. */

export const WORLD_WIDTH = 3600
export const WHEELBASE = 40
export const MAX_CLIMB = 0.72
export const SCAN_RANGE = 78
export const ROVER_START_X = 280

const GRAVITY = 980
const ACCEL = 560
const FRICTION = 2.6
const MAX_SPEED = 220

export interface SurveyOutcrop {
  id: string
  label: string
  mineral: string
  x: number
}

export const SURVEY_OUTCROPS: SurveyOutcrop[] = [
  { id: 'outcrop-a', label: 'OUTCROP A', mineral: 'iron', x: 860 },
  { id: 'outcrop-b', label: 'OUTCROP B', mineral: 'copper', x: 1680 },
  { id: 'outcrop-c', label: 'OUTCROP C', mineral: 'aluminium', x: 2680 },
]

export interface RoverPose {
  x: number
  /** Wheel-midpoint height in the same space as contactY (positive down). */
  y: number
  vx: number
  vy: number
  grounded: boolean
  angle: number
  bob: number
}

export type DriveInput = -1 | 0 | 1

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function bowl(x: number, center: number, radius: number, depth: number): number {
  const d = (x - center) / radius
  if (Math.abs(d) >= 1) return 0
  return depth * (1 - d * d)
}

/** A single climbable ridge placed in front of the landing site. */
function showcaseHill(x: number): number {
  const start = 240
  const width = 860
  const t = (x - start) / width
  if (t <= 0 || t >= 1) return 0
  return 156 * Math.sin(t * Math.PI)
}

function mound(x: number, center: number, radius: number, height: number): number {
  const d = Math.abs(x - center) / radius
  if (d >= 1) return 0
  return height * (1 - d) * (1 - d)
}

/** Continuous elevation. Hills are climbable. The spike near x=2140 is not. */
export function elevation(x: number): number {
  const xx = clamp(x, 0, WORLD_WIDTH)
  const hills = Math.sin(xx * 0.0032) * 28 + showcaseHill(xx)
  const crater = bowl(xx, 1480, 210, 170)
  const rocks = mound(xx, 540, 36, 10) + mound(xx, 1180, 28, 8) + mound(xx, 1960, 32, 9)
  const cliff = mound(xx, 2140, 26, 120)
  return hills - crater + rocks + cliff
}

/** Surface position, positive downward, relative to the horizon baseline. */
export function contactY(x: number): number {
  return -elevation(x)
}

export function slopeAt(x: number): number {
  const rear = contactY(x - WHEELBASE / 2)
  const front = contactY(x + WHEELBASE / 2)
  return (front - rear) / WHEELBASE
}

export function createRover(): RoverPose {
  const y = (contactY(ROVER_START_X - WHEELBASE / 2) + contactY(ROVER_START_X + WHEELBASE / 2)) / 2
  return { x: ROVER_START_X, y, vx: 0, vy: 0, grounded: true, angle: Math.atan(slopeAt(ROVER_START_X)), bob: 0 }
}

function midpoint(x: number): number {
  return (contactY(x - WHEELBASE / 2) + contactY(x + WHEELBASE / 2)) / 2
}

export function stepRover(pose: RoverPose, input: DriveInput, dt: number): RoverPose {
  const step = clamp(dt, 0, 0.05)
  const next: RoverPose = { ...pose }
  const slope = slopeAt(next.x)
  if (next.grounded) {
    const blocked = (input > 0 && -slope > MAX_CLIMB) || (input < 0 && slope > MAX_CLIMB)
    const drive = blocked ? 0 : input * ACCEL
    const glide = GRAVITY * (slope / Math.sqrt(1 + slope * slope)) * 0.62
    next.vx += (drive + glide - next.vx * FRICTION) * step
    next.vx = clamp(next.vx, -MAX_SPEED, MAX_SPEED)
    let nx = clamp(next.x + next.vx * step, 70, WORLD_WIDTH - 70)
    const run = nx - next.x
    const rise = contactY(next.x) - contactY(nx)
    if (Math.abs(run) > 0.0001 && rise / Math.abs(run) > MAX_CLIMB && Math.sign(run) === Math.sign(next.vx)) {
      next.vx = -Math.abs(next.vx) * 0.25 * Math.sign(run)
      nx = next.x
    }
    const here = midpoint(next.x)
    const ahead = midpoint(nx)
    if (ahead - here > 26 && Math.abs(next.vx) > 110) {
      next.grounded = false
      next.vy = Math.max(30, next.vx * slope)
      next.x = nx
      next.y = here
      return next
    }
    next.x = nx
    next.bob = Math.sin(next.x * 0.42) * Math.min(3.4, Math.abs(next.vx) * 0.014)
    next.y = midpoint(next.x) + next.bob
    next.vy = 0
    next.angle = Math.atan(slopeAt(next.x))
    next.grounded = true
    return next
  }
  next.vy += GRAVITY * step
  next.x = clamp(next.x + next.vx * step, 70, WORLD_WIDTH - 70)
  next.y += next.vy * step
  const ground = midpoint(next.x)
  if (next.y >= ground) {
    next.y = ground
    next.vy = 0
    next.grounded = true
    next.angle = Math.atan(slopeAt(next.x))
  }
  return next
}

export function outcropNear(x: number): SurveyOutcrop | null {
  let best: SurveyOutcrop | null = null
  let bestDistance = SCAN_RANGE
  for (const outcrop of SURVEY_OUTCROPS) {
    const distance = Math.abs(outcrop.x - x)
    if (distance <= bestDistance) {
      best = outcrop
      bestDistance = distance
    }
  }
  return best
}
