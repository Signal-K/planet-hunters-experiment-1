import { describe, expect, it } from 'vitest'
import {
  CRAFTING_CATEGORY_ORDER,
  CRAFTING_RECIPES,
  craftingAffordability,
  craftingRecipeById,
  craftingRecipeForTakeonType,
  FACTORY_RECIPES,
  refundMinerals,
  SANDBOX_STRUCTURE_RECIPES,
  spendMinerals,
} from './crafting'

describe('crafting registry', () => {
  it('has unique ids and every category is ordered', () => {
    const ids = CRAFTING_RECIPES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of CRAFTING_RECIPES) expect(CRAFTING_CATEGORY_ORDER).toContain(r.category)
  })

  it('covers every domain: field, earth base, rooms, target builds, refining, rocket parts, vehicles', () => {
    const categories = new Set(CRAFTING_RECIPES.map(r => r.category))
    for (const c of CRAFTING_CATEGORY_ORDER) expect(categories.has(c)).toBe(true)
  })

  it('maps every sandbox recipe to a takeon structure type', () => {
    for (const r of SANDBOX_STRUCTURE_RECIPES) {
      expect(r.takeonType).toBeTruthy()
      expect(craftingRecipeForTakeonType(r.takeonType!)?.id).toBe(r.id)
    }
    expect(craftingRecipeForTakeonType('road')?.category).toBe('road')
    expect(craftingRecipeForTakeonType('factory')?.placeable).toBe(true)
    expect(craftingRecipeForTakeonType('refinery')).toBeDefined()
  })

  it('factory recipes consume refined goods and output rocket parts', () => {
    for (const r of FACTORY_RECIPES) {
      expect(r.producedAt).toBe('factory')
      expect(Object.keys(r.costRefined ?? {}).length).toBeGreaterThan(0)
      expect(r.output?.kind).toBe('rocket-part')
    }
  })
})

describe('affordability and spend', () => {
  it('reports exact shortfalls', () => {
    const recipe = craftingRecipeById('field-cache')!
    const check = craftingAffordability(recipe, recipe.costFrancs - 1000, { aluminium: 2 })
    expect(check.ok).toBe(false)
    expect(check.francsShort).toBe(1000)
    expect(check.mineralsShort.aluminium).toBe(recipe.costMinerals.aluminium - 2)
    expect(check.mineralsShort.carbon).toBe(recipe.costMinerals.carbon)
  })

  it('spend then refund round-trips the inventory', () => {
    const recipe = craftingRecipeById('field-solar-array')!
    const start = { silicon: 10, aluminium: 8, copper: 4, iron: 1 }
    const spent = spendMinerals(start, recipe.costMinerals)
    expect(spent.aluminium).toBeUndefined()
    expect(spent.silicon).toBe(2)
    expect(refundMinerals(spent, recipe.costMinerals)).toEqual(start)
  })
})
