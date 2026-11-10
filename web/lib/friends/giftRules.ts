import { MINERAL_META } from '@/lib/data/minerals'

/** SSL-794: 3 of any common or uncommon ore, or 1 of any rare or exotic ore, per friend per day. Mirrors friendGiftAmounts in pocketbase/friends.go. */
const GIFT_UNIT: Record<string, number> = { common: 3, uncommon: 3, rare: 1, exotic: 1 }

/** Ores that can be given. Shower debris and fireball fragments are event evidence, not gifts. */
const NOT_GIFTABLE = new Set(['orionid_debris', 'draconid_debris', 'leonid_debris', 'geminid_debris', 'fireball_fragment'])

/** How many of this ore one gift carries, or 0 when it cannot be given. */
export function giftAmount(mineralId: string): number {
  const meta = MINERAL_META[mineralId]
  if (!meta || NOT_GIFTABLE.has(mineralId)) return 0
  return GIFT_UNIT[meta.rarity] ?? 0
}

export interface GiftChoice { id: string; name: string; amount: number }

/** What the player can give right now: ores whose gift amount is in the stash. */
export function giftableOres(stash: Record<string, number> | undefined): GiftChoice[] {
  return Object.entries(stash ?? {})
    .map(([id, have]) => ({ id, have, amount: giftAmount(id) }))
    .filter(o => o.amount > 0 && o.have >= o.amount)
    .map(o => ({ id: o.id, name: MINERAL_META[o.id].name, amount: o.amount }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
