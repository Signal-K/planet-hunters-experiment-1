import type { Player } from '@/lib/game-types'

export const RESEARCH_FRAGMENT_CONVERSION_RATE = 10

export type ResearchMarketplaceScope = 'location' | 'account'

export interface ResearchMarketplaceItem {
  id: string
  kind: 'cosmetic' | 'bonus'
  name: string
  description: string
  scope: string
  bonusRate?: number
  baseCost: number
  costStep: number
}

export const RESEARCH_MARKETPLACE_ITEMS: readonly ResearchMarketplaceItem[] = [
  {
    id: 'research-ink',
    kind: 'cosmetic',
    name: 'Research ink',
    description: 'Permanent badge mark.',
    scope: 'Cosmetic',
    baseCost: 8,
    costStep: 0,
  },
  {
    id: 'exchange-calibration',
    kind: 'bonus',
    name: 'Exchange calibration',
    description: 'Permanent +2% sale value.',
    scope: 'Exchange',
    bonusRate: 0.02,
    baseCost: 12,
    costStep: 8,
  },
  {
    id: 'research-network',
    kind: 'bonus',
    name: 'Research network',
    description: 'Permanent +1% sale value.',
    scope: 'Account',
    bonusRate: 0.01,
    baseCost: 18,
    costStep: 12,
  },
]

type ResearchPlayer = Pick<Player, 'researchFragments' | 'researchUniversalFragments' | 'researchPurchases' | 'researchCosmetics' | 'researchPermanentBonuses' | 'communityBonus'>

export function researchItemById(id: string): ResearchMarketplaceItem | undefined {
  return RESEARCH_MARKETPLACE_ITEMS.find(item => item.id === id)
}

export function researchItemPurchaseCount(player: Pick<ResearchPlayer, 'researchPurchases'>, itemId: string): number {
  return Math.max(0, Math.floor(player.researchPurchases?.[itemId] ?? 0))
}

export function researchItemCost(player: Pick<ResearchPlayer, 'researchPurchases'>, item: ResearchMarketplaceItem): number {
  return item.baseCost + researchItemPurchaseCount(player, item.id) * item.costStep
}

export function convertResearchFragments<T extends ResearchPlayer>(player: T): T {
  const regular = Math.max(0, Math.floor(player.researchFragments ?? 0))
  const converted = Math.floor(regular / RESEARCH_FRAGMENT_CONVERSION_RATE) * RESEARCH_FRAGMENT_CONVERSION_RATE
  if (converted <= 0) return player
  return {
    ...player,
    researchFragments: regular - converted,
    researchUniversalFragments: (player.researchUniversalFragments ?? 0) + converted / RESEARCH_FRAGMENT_CONVERSION_RATE,
  }
}

export function buyResearchItem<T extends ResearchPlayer>(player: T, itemId: string): T {
  const item = researchItemById(itemId)
  if (!item) return player
  const cost = researchItemCost(player, item)
  const universal = Math.max(0, Math.floor(player.researchUniversalFragments ?? 0))
  if (universal < cost) return player
  const count = researchItemPurchaseCount(player, itemId) + 1
  const next = {
    ...player,
    researchUniversalFragments: universal - cost,
    researchPurchases: { ...(player.researchPurchases ?? {}), [itemId]: count },
  }
  if (item.kind === 'cosmetic') {
    const cosmetics = new Set(player.researchCosmetics ?? [])
    cosmetics.add(itemId)
    return { ...next, researchCosmetics: [...cosmetics] }
  }
  return {
    ...next,
    researchPermanentBonuses: {
      ...(player.researchPermanentBonuses ?? {}),
      [itemId]: count,
    },
  }
}

/** Exchange sale rate from permanent research items plus this month's community goal while it lasts (SSL-685). */
export function permanentResearchSaleRate(player: Pick<ResearchPlayer, 'researchPermanentBonuses' | 'communityBonus'>, now: number = Date.now()): number {
  const exchange = Math.max(0, player.researchPermanentBonuses?.['exchange-calibration'] ?? 0) * 0.02
  const account = Math.max(0, player.researchPermanentBonuses?.['research-network'] ?? 0) * 0.01
  return exchange + account + communityBonusRate(player, now).sale
}

/** The community goal reward as fractions (0.03 / 0.07), zero once the month it was earned in has ended. */
export function communityBonusRate(player: Pick<ResearchPlayer, 'communityBonus'>, now: number = Date.now()): { sale: number; fuel: number } {
  const b = player.communityBonus
  if (!b || !(b.until > now)) return { sale: 0, fuel: 0 }
  return { sale: Math.max(0, b.salePct) / 100, fuel: Math.max(0, b.fuelPct) / 100 }
}

/** Record what `/api/community/research` says the goal gives; the same player comes back when nothing changes. */
export function withCommunityBonus<T extends Pick<ResearchPlayer, 'communityBonus'>>(
  player: T,
  server: { month: string; reachedAt: number | null; bonusUntil: number | null; bonusPct: number; fuelPct?: number } | null | undefined,
): T {
  if (!server || server.reachedAt == null || server.bonusUntil == null) return player
  const next = { month: server.month, salePct: server.bonusPct, fuelPct: server.fuelPct ?? 0, until: server.bonusUntil }
  const have = player.communityBonus
  if (have && have.month === next.month && have.salePct === next.salePct && have.fuelPct === next.fuelPct && have.until === next.until) return player
  return { ...player, communityBonus: next }
}
