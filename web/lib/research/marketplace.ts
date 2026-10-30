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

type ResearchPlayer = Pick<Player, 'researchFragments' | 'researchUniversalFragments' | 'researchPurchases' | 'researchCosmetics' | 'researchPermanentBonuses'>

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

export function permanentResearchSaleRate(player: Pick<ResearchPlayer, 'researchPermanentBonuses'>): number {
  const exchange = Math.max(0, player.researchPermanentBonuses?.['exchange-calibration'] ?? 0) * 0.02
  const account = Math.max(0, player.researchPermanentBonuses?.['research-network'] ?? 0) * 0.01
  return exchange + account
}
