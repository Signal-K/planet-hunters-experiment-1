/**
 * The Landnam economy, in one place.
 *
 * ## Why this file exists
 *
 * The economy used to run on two scales that never met. Missions, rockets and
 * structures were denominated in billions; minerals, refining and daily quests
 * in hundreds and thousands. A full Prospector hold of the most valuable
 * mineral in the game sold for ~₣33,600 against a ₣1,500,000,000 contract fee —
 * about 0.002%. Mining, the mechanic the game is named for, could not move the
 * player's balance at all, and the Refinery would have needed ~450,000 cycles
 * to repay its own construction.
 *
 * Two other things were quietly broken by the same split:
 *
 * - The mission generator computed `oreValue × 1500 × multipliers` and then
 *   passed it through a floor of ₣1.5B, so the computed part contributed under
 *   1% and every mission effectively paid its floor. The formula was decorative.
 * - The player started with 10B against a 1.3B rocket — enough for seven
 *   rockets before anything felt like a decision.
 *
 * ## The scale now
 *
 * One band, denominated so a contract fee is ~₣15–25M. That keeps the
 * "spaceflight costs real money" feel while staying legible on a phone HUD
 * (`₣18.0M`, not `₣18,000,000,000`). Every other number is defined as a
 * relationship to that fee rather than as a free-floating magic constant.
 *
 * | Thing | Value | As a share of an M2 fee |
 * |---|---:|---:|
 * | M1 contract fee | ₣15M | 83% |
 * | M2 contract fee | ₣18M | 100% |
 * | Prospector | ₣13M | 72% |
 * | Starting balance | ₣9M | 50% |
 * | Refinery | ₣8M | 44% |
 * | Full hold of exotic ore | ₣11M | 61% |
 * | Full hold of common ore | ₣2.5M | 14% |
 * | Daily quest | ₣1.2–2M | 7–11% |
 *
 * The starting balance is deliberately *below* the Prospector's price: M1's fee
 * is what buys your second rocket, which is what the onboarding was always
 * documented as intending.
 */

// ── Contract fees ──────────────────────────────────────────────────────────
// A mission's fee is the service payment. It is the anchor everything else is
// sized against.

export const CONTRACT_FEES: Record<number, number> = {
  1: 15_000_000,
  2: 18_000_000,
  3: 22_000_000,
  4: 24_000_000,
}

/** Each mission past the fourth adds this much to the fee. */
export const CONTRACT_FEE_STEP = 2_500_000

/**
 * How much the specific cargo a contract asks for can swing its fee, as a
 * share of the base fee. Replaces the old `× 1500` constant, whose output was
 * swamped by the floor it was then clamped against.
 */
export const CARGO_BONUS_CAP = 0.18

/** Ore value is worth this much as a fee bonus before the cap applies. */
export const CARGO_BONUS_RATE = 0.4

/** Flat fee for a scan-only contract, which carries no cargo to price. */
export const SCAN_CONTRACT_FEE = 2_000_000

// ── Mineral values ─────────────────────────────────────────────────────────
// Priced by rarity band. The old prices spread 70× from carbon (60) to rhodium
// (4200), which meant that once minerals were worth enough for rare ore to
// matter, common ore was worth nothing at all. Compressed to ~4.4×, so a hold
// of common ore is a real if modest return and a hold of exotic ore is a
// genuine windfall.

export type MineralRarity = 'common' | 'uncommon' | 'rare' | 'exotic'

export const MINERAL_VALUE: Record<MineralRarity, number> = {
  common: 250_000,
  uncommon: 420_000,
  rare: 700_000,
  exotic: 1_100_000,
}

/** Refining multiplies the input ore's value by this much. */
export const REFINING_VALUE_MULTIPLIER = 1.6

/** What it costs to run one refining cycle, as a share of the input's value. */
export const REFINING_COST_RATE = 0.07

// ── Hardware and structures ────────────────────────────────────────────────

export const ROCKET_PRICES = {
  sr1: 0,
  sr2: 13_000_000,
  sr3: 40_000_000,
} as const

export const STRUCTURE_PRICES = {
  refinery: 8_000_000,
  garage: 6_000_000,
  academy: 12_000_000,
  launchpadUpgrade: 10_000_000,
  deepSpaceTelescope: 15_000_000,
} as const

// Subsurface excavation + room construction (STS-633). Earth Base's surface
// footprint is fixed — the below-soil deck is the player's only way to add
// more structure once the surface plots are full — so excavation is priced
// well under a Refinery: it is the entry cost to a new build area, not a
// structure in itself. Individual room builds sit near Refinery scale since
// each one is a working facility.
export const SUBSURFACE_EXCAVATION_COST = 2_000_000
export const SUBSURFACE_EXCAVATION_MATERIALS = { aluminium: 10 } as const
export const SUBSURFACE_ROOM_PRICES = {
  'mineral-vault': 3_000_000,
  'parts-locker': 3_000_000,
  'habitat-training': 6_000_000,
} as const

// Astronaut Academy / crew economy (STS-587, STS-593, STS-597).
export const CREW_FIRST_HIRE_COST = 1_500_000
export const CREW_HIRE_ESCALATION = 1.6
export const CREW_WEEKLY_HIRE_CAP = 2
export const CREW_TOTAL_HIRED_CAP = 6
export const CREW_DAILY_UPKEEP = 60_000
export const ACADEMY_DAILY_UPKEEP = 200_000
export const CREW_QUIT_REFUND_RATE = 0.5
export const TRAINING_SESSIONS_PER_DAY = 2
export const CREW_TRAINING_DURATION_MS = 24 * 60 * 60 * 1000
export const ACADEMY_RESEARCH_XP_COST = 150
export const CREW_MODULE_RESEARCH_XP_COST = 100
export const CREW_MODULE_PRICE = 5_500_000
export const CREW_MISSION_XP = 100
export const CREW_TRAINING_XP = 100
export const FIRST_CREW_ARRIVAL_BONUS = 1_000_000
export const LANDING_RESEARCH_XP_COST = 100
export const LANDER_MODULE_PRICE = 5_500_000

/** Starting francs. Below the Prospector's price on purpose — see the header. */
export const STARTING_FRANCS = 9_000_000

// ── Credit ─────────────────────────────────────────────────────────────────

export const LOAN_PRINCIPAL = 5_000_000
export const LOAN_INTEREST_RATE = 0.08
export const LOAN_DEBT_ON_ACCEPT = LOAN_PRINCIPAL * (1 + LOAN_INTEREST_RATE)

/** Balance below which the game offers the emergency loan. */
export const BANKRUPTCY_THRESHOLD = 2_000_000

// ── Daily rewards ──────────────────────────────────────────────────────────

export const DAILY_QUEST_REWARDS = {
  small: 1_200_000,
  medium: 1_500_000,
  large: 2_000_000,
} as const

// ── Market ─────────────────────────────────────────────────────────────────

/** Selling raw ore on the open market returns this share of book value. */
export const OPEN_MARKET_SELL_RATE = 0.8
