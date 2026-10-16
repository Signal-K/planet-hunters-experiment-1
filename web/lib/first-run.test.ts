import { describe, expect, it } from 'vitest'
import { ROCKET_MODELS, STARTING_FRANCS } from '@/lib/data'
import { CUSTOMIZER_PARTS } from '@/lib/data/shipCustomizer'
import { getRequiredRocketModel } from '@/lib/rockets'

// A brand-new player has the starting francs and the free Explorer. Nothing in the first minutes may need a purchase.
describe('first run', () => {
  it('the free Explorer is available from the start and costs nothing', () => {
    const explorer = ROCKET_MODELS.find(model => model.missionsRequired === 0 && !model.locked)!
    expect(explorer.costFrancs).toBe(0)
    expect(getRequiredRocketModel(0).id).toBe(explorer.id)
  })
  it('the starting francs buy a full starter set with change to spare', () => {
    const cheapestSet = ['engine', 'booster', 'cockpit', 'payload'].reduce((sum, kind) =>
      sum + Math.min(...CUSTOMIZER_PARTS.filter(part => part.kind === kind && (part.unlockedAtMissions ?? 0) === 0).map(part => part.price)), 0)
    expect(cheapestSet).toBeLessThanOrEqual(STARTING_FRANCS * 0.75)
  })
  it('the dearest starter part is still affordable on its own', () => {
    const dearest = Math.max(...CUSTOMIZER_PARTS.filter(part => (part.unlockedAtMissions ?? 0) === 0).map(part => part.price))
    expect(dearest).toBeLessThan(STARTING_FRANCS / 2)
  })
})
