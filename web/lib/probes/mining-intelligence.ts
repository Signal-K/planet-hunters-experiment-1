import type { Target } from '@/lib/data/types'
import type { Player } from '@/lib/game-types'
import { sectorIds, surveyOf } from './survey-probe'

/** Downloaded evidence only: elapsed mapping time does not silently collect data or award research. */
export function miningIntelligence(
  player: Pick<Player, 'probes' | 'agencyCommunity'>,
  target: Pick<Target, 'id' | 'minerals'>,
  rarity: (mineral: string) => string | undefined = () => undefined,
) {
  const valid = new Set(sectorIds())
  const personal = Object.keys(player.probes?.[target.id]?.readings ?? {}).filter(id => valid.has(id))
  const shared = [...new Set(player.agencyCommunity?.surveys[target.id] ?? [])].filter(id => valid.has(id))
  const sectors = [...new Set([...personal, ...shared])].sort()
  return {
    sectors, totalSectors: valid.size, personalSectors: personal.length, sharedSectors: shared.length,
    findings: surveyOf(target, sectors, rarity),
  }
}

/** Survey frequency shapes the background mix; authored objectives always remain obtainable. */
export function miningSeamPool(
  player: Pick<Player, 'probes' | 'agencyCommunity'>,
  target: Pick<Target, 'id' | 'minerals'>,
  required: string[],
  excluded: string[] = [],
) {
  const evidence = miningIntelligence(player, target)
  const known = evidence.findings.flatMap(row => Array.from({ length: row.sectors }, () => row.mineral))
  const source = known.length ? 'probe' : 'composition'
  const objectives = [...new Set(required)].filter(id => !excluded.includes(id))
  const mix = (known.length ? known : target.minerals).filter(id => !excluded.includes(id) && !objectives.includes(id))
  const minerals = [...objectives, ...mix]
  return { minerals: minerals.length ? minerals : ['iron'], source, coverage: evidence.sectors.length }
}
