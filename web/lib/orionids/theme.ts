// Orionids 2026 art selection (SSL-475).
// Blueprint is the default. The dark set is used only when the mining canvas
// sky is still dark. Paths mirror manifest.json variantSets.

export type OrionidsVariantId = 'blueprint' | 'dark'

/** Pixi clear colour of the laser-mining sky. Paper-2, so the canvas is light. */
export const MINING_CANVAS_SKY = 0xdfe9f3

const ASSET = '/game/assets/events/orionids'

export interface AnchoredName {
  file: string
  ax: number
  ay: number
}

export interface OrionidsVariant {
  id: OrionidsVariantId
  debris: AnchoredName[]
  mined: AnchoredName[]
  fallSheet: string
  fallFrame: { w: number; h: number; count: number; fps: number; fallCount: number; ax: number; ay: number }
  impactSheet: string
  impactFrame: { w: number; h: number; count: number; fps: number; ax: number; ay: number }
  dust: string
  streaks: AnchoredName[]
  streakBlend: 'normal' | 'screen'
  sky: string
  skyBlend: 'multiply' | 'screen'
  chipOn: string
  chipOff: string
  badgeSmall: string
  iconResource: string
}

const BLUEPRINT: OrionidsVariant = {
  id: 'blueprint',
  debris: [
    { file: `${ASSET}/debris/debris-01-light.png`, ax: 0.5, ay: 0.9728 },
    { file: `${ASSET}/debris/debris-02-light.png`, ax: 0.5, ay: 0.9694 },
    { file: `${ASSET}/debris/debris-03-light.png`, ax: 0.5, ay: 0.959 },
    { file: `${ASSET}/debris/debris-04-light.png`, ax: 0.5, ay: 0.971 },
  ],
  mined: [
    { file: `${ASSET}/debris/debris-01-mined-light.png`, ax: 0.5, ay: 0.9704 },
    { file: `${ASSET}/debris/debris-02-mined-light.png`, ax: 0.5, ay: 0.9761 },
    { file: `${ASSET}/debris/debris-03-mined-light.png`, ax: 0.5, ay: 0.9757 },
    { file: `${ASSET}/debris/debris-04-mined-light.png`, ax: 0.5, ay: 0.9762 },
  ],
  fallSheet: `${ASSET}/fx/debris-fall-line-sheet.png`,
  fallFrame: { w: 160, h: 140, count: 8, fps: 24, fallCount: 6, ax: 0.6438, ay: 0.775 },
  impactSheet: `${ASSET}/fx/impact-line-sheet.png`,
  impactFrame: { w: 91, h: 82, count: 6, fps: 12, ax: 0.5, ay: 0.9085 },
  dust: `${ASSET}/debris/dust-puff.png`,
  streaks: [
    { file: `${ASSET}/fx/streak-line-01.png`, ax: 0.9038, ay: 0.8739 },
    { file: `${ASSET}/fx/streak-line-02.png`, ax: 0.9238, ay: 0.8994 },
    { file: `${ASSET}/fx/streak-line-03.png`, ax: 0.9352, ay: 0.9135 },
    { file: `${ASSET}/fx/streak-line-04.png`, ax: 0.8148, ay: 0.7656 },
  ],
  streakBlend: 'normal',
  sky: `${ASSET}/sky/orionids-sky-blueprint-1280.png`,
  skyBlend: 'multiply',
  chipOn: `${ASSET}/ui/chip-orionids-active.png`,
  chipOff: `${ASSET}/ui/chip-orionids-active-dot-off.png`,
  badgeSmall: `${ASSET}/ui/badge-orionids-2026-light-128.png`,
  iconResource: `${ASSET}/ui/icon-orionid-debris.png`,
}

const DARK: OrionidsVariant = {
  id: 'dark',
  debris: [
    { file: `${ASSET}/debris/debris-01.png`, ax: 0.5, ay: 0.9592 },
    { file: `${ASSET}/debris/debris-02.png`, ax: 0.5, ay: 0.9594 },
    { file: `${ASSET}/debris/debris-03.png`, ax: 0.5, ay: 0.9569 },
    { file: `${ASSET}/debris/debris-04.png`, ax: 0.5, ay: 0.9631 },
  ],
  mined: [
    { file: `${ASSET}/debris/debris-01-mined.png`, ax: 0.5, ay: 0.9701 },
    { file: `${ASSET}/debris/debris-02-mined.png`, ax: 0.5, ay: 0.9712 },
    { file: `${ASSET}/debris/debris-03-mined.png`, ax: 0.5, ay: 0.9706 },
    { file: `${ASSET}/debris/debris-04-mined.png`, ax: 0.5, ay: 0.9761 },
  ],
  fallSheet: `${ASSET}/fx/debris-fall-sheet.png`,
  fallFrame: { w: 160, h: 140, count: 8, fps: 24, fallCount: 6, ax: 0.6438, ay: 0.775 },
  impactSheet: `${ASSET}/fx/impact-sheet.png`,
  impactFrame: { w: 91, h: 82, count: 6, fps: 12, ax: 0.5, ay: 0.9085 },
  dust: `${ASSET}/debris/dust-puff.png`,
  streaks: [
    { file: `${ASSET}/fx/streak-01.png`, ax: 0.8486, ay: 0.8099 },
    { file: `${ASSET}/fx/streak-02.png`, ax: 0.8566, ay: 0.8163 },
    { file: `${ASSET}/fx/streak-03.png`, ax: 0.8586, ay: 0.8224 },
    { file: `${ASSET}/fx/streak-04.png`, ax: 0.8377, ay: 0.8121 },
  ],
  streakBlend: 'screen',
  sky: `${ASSET}/sky/orionids-sky-overlay-screen-1280.png`,
  skyBlend: 'screen',
  chipOn: `${ASSET}/ui/chip-orionids-active-dark.png`,
  chipOff: `${ASSET}/ui/chip-orionids-active-dark-dot-off.png`,
  badgeSmall: `${ASSET}/ui/badge-orionids-2026-128.png`,
  iconResource: `${ASSET}/ui/icon-orionid-debris.png`,
}

export const ORIONIDS_VARIANTS: Record<OrionidsVariantId, OrionidsVariant> = {
  blueprint: BLUEPRINT,
  dark: DARK,
}

/** Relative luminance under 0.4 reads as a dark canvas. */
export function miningCanvasIsDark(color: number = MINING_CANVAS_SKY): boolean {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = channel((color >> 16) & 0xff)
  const g = channel((color >> 8) & 0xff)
  const b = channel(color & 0xff)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4
}

/** Mining uses the canvas sky. Base uses the hub dusk sky, which is dark. */
export function orionidsVariantForSurface(surface: 'base' | 'mining'): OrionidsVariantId {
  if (surface === 'mining' && !miningCanvasIsDark()) return 'blueprint'
  return 'dark'
}

/** Looping fall frames, held on the first frame when motion is reduced. */
export function fallFrameIndex(elapsed: number, fps: number, frameCount: number, reducedMotion: boolean): number {
  if (frameCount <= 1 || reducedMotion) return 0
  const i = Math.floor(elapsed * fps)
  return ((i % frameCount) + frameCount) % frameCount
}

/** Land clip is the last two sheet frames. Reduced motion jumps to the last frame and finishes. */
export function landFrameIndex(elapsed: number, fps: number, reducedMotion: boolean): { frame: number; done: boolean } {
  if (reducedMotion) return { frame: 7, done: true }
  const i = Math.max(0, Math.floor(elapsed * fps))
  return { frame: 6 + Math.min(1, i), done: i >= 2 }
}
