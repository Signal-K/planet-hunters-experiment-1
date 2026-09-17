export function transitRocketTopPercent(progress: number): number {
  return 88 - Math.min(42, progress * 0.42)
}

export function transitRocketScreenPos(progress: number, W: number, H: number): { x: number; y: number } {
  return { x: W * 0.5, y: H * (transitRocketTopPercent(progress) / 100) }
}

/** Outbound legs show Earth as a receding limb at the bottom of the frame. */
export function transitOriginEarthRadius(progress: number, H: number, destKind: string): number {
  if (destKind === 'earth') return 0
  const p = Math.min(1, Math.max(0, progress / 100))
  return Math.max(0, (1 - p / 0.42) * H * 0.62)
}
