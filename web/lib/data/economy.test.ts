import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CARGO_BONUS_CAP, CARGO_BONUS_RATE, MINERAL_VALUE, STARTING_FRANCS,
  ROCKET_PRICES, STRUCTURE_PRICES, CONTRACT_FEES, SURFACE_SITE_ACCESS_FEES,
} from './economy'
import { MINERAL_META } from './minerals'
import { ROCKET_MODELS } from './rockets'
import { missionPayoutFloor } from './payouts'

describe('economy scale', () => {
  it('keeps the starting balance below the second rocket, so M1 has to fund it', () => {
    // The onboarding was always documented as "M1's fee buys your Prospector",
    // but the player used to start with 10B against a 1.3B rocket — enough for
    // seven of them before anything felt like a decision.
    expect(STARTING_FRANCS).toBeLessThan(ROCKET_PRICES.prospector)
    expect(missionPayoutFloor(1)).toBeGreaterThan(ROCKET_PRICES.prospector)
  })

  it('makes a full cargo hold worth a visible share of a contract', () => {
    // The whole point of the overhaul: a Prospector hold of the best ore in
    // the game used to sell for 0.002% of a contract fee.
    const hold = ROCKET_MODELS.find(r => r.name === 'Prospector')!.stats.cargo
    const fee = CONTRACT_FEES[2]
    const commonShare = (hold * MINERAL_VALUE.common) / fee
    const exoticShare = (hold * MINERAL_VALUE.exotic) / fee
    expect(commonShare).toBeGreaterThan(0.1)
    expect(exoticShare).toBeLessThan(1)
    expect(exoticShare / commonShare).toBeLessThan(5)
  })

  it('lets the requested cargo actually move a contract fee', () => {
    // Previously the generator's computed figure was ~0.6% of the floor it was
    // clamped against, so every contract paid exactly its floor.
    const oreValue = 6 * MINERAL_VALUE.rare
    const bonus = oreValue * CARGO_BONUS_RATE
    expect(bonus / CONTRACT_FEES[1]).toBeGreaterThan(0.05)
    expect(CARGO_BONUS_CAP).toBeGreaterThan(0)
  })

  it('prices every mineral from a rarity band, with no stragglers', () => {
    for (const [id, meta] of Object.entries(MINERAL_META)) {
      expect(Object.values(MINERAL_VALUE), `${id} is off-band`).toContain(meta.price)
      expect(meta.price).toBe(MINERAL_VALUE[meta.rarity as keyof typeof MINERAL_VALUE])
    }
  })

  it('keeps every franc figure inside one readable band', () => {
    const values = [
      STARTING_FRANCS, ROCKET_PRICES.prospector, ROCKET_PRICES.unannounced3,
      ...Object.values(STRUCTURE_PRICES), ...Object.values(CONTRACT_FEES),
      ...Object.values(MINERAL_VALUE),
    ]
    // Two scales five orders of magnitude apart is what this replaced. Nothing
    // should sit more than ~200x from anything else.
    expect(Math.max(...values) / Math.min(...values)).toBeLessThan(200)
  })

  it('keeps every solo surface access fee below one M2 contract fee', () => {
    expect(Math.max(...Object.values(SURFACE_SITE_ACCESS_FEES))).toBeLessThan(CONTRACT_FEES[2])
    expect(Math.min(...Object.values(SURFACE_SITE_ACCESS_FEES))).toBeGreaterThan(0)
  })

  it('keeps the PocketBase seed in step with these constants', () => {
    // seedRecord upserts on every backend start, so a drifted Go constant
    // silently overwrites the catalog the game reads.
    const go = readFileSync(resolve(__dirname, '../../../pocketbase/main.go'), 'utf8')
    expect(go).toContain(`mineralValueCommon   = ${MINERAL_VALUE.common.toLocaleString('en-US').replace(/,/g, '_')}`)
    expect(go).toContain(`mineralValueExotic   = ${MINERAL_VALUE.exotic.toLocaleString('en-US').replace(/,/g, '_')}`)
    expect(go).toContain(`structurePriceRefinery = ${STRUCTURE_PRICES.refinery.toLocaleString('en-US').replace(/,/g, '_')}`)
    expect(go).toContain(`cargoBonusRate = ${CARGO_BONUS_RATE}`)
    expect(go).toContain(`cargoBonusCap  = ${CARGO_BONUS_CAP}`)
    for (const [seq, fee] of Object.entries(CONTRACT_FEES)) {
      expect(go, `contract fee ${seq}`).toContain(fee.toLocaleString('en-US').replace(/,/g, '_'))
    }
  })
})
