import raw from './ore-flecks.json'

function hex(value: string): number {
  return parseInt(value.replace('#', ''), 16)
}

const flecks: Record<string, number> = Object.fromEntries(
  Object.entries(raw as Record<string, string>).map(([id, color]) => [id, hex(color)]),
)

/** Crystalline fleck for a mineral. Unknown ids get a neutral grey. */
export function oreFleck(mineral: string): number {
  return flecks[mineral] ?? 0x8e98a4
}

export function oreFleckStyle(mineral: string): 'seam' | 'crystal' | 'fleck' {
  if (mineral === 'carbon' || mineral === 'nickel') return 'seam'
  if (mineral === 'ice' || mineral === 'hydrogen' || mineral === 'silicon') return 'crystal'
  return 'fleck'
}
