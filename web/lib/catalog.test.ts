import { describe, it, expect } from 'vitest'
import { toTarget, toMission, toPart, toClient, toStructure } from './catalog'

describe('Landnam Catalog Mapping', () => {
  it('maps a raw database record to a Target object', () => {
    const raw = {
      slug: 'eros',
      name: 'Eros',
      body_type: 'asteroid',
      orbit: 3,
      difficulty: 'Medium',
      minerals: '["Iron", "Silica"]'
    }
    const target = toTarget(raw)
    expect(target.id).toBe('eros')
    expect(target.minerals).toEqual(['Iron', 'Silica'])
  })

  it('handles empty or malformed minerals JSON in toTarget', () => {
    const raw = { slug: 'empty', minerals: '' }
    const target = toTarget(raw)
    expect(target.minerals).toEqual([])
  })

  it('maps a raw mission record with payout and requirements', () => {
    const raw = {
      slug: 'm1',
      title: 'First Flight',
      payout_francs: 5000,
      requires_minerals: '{"Water": 10}'
    }
    const mission = toMission(raw)
    expect(mission.id).toBe('m1')
    expect(mission.payout.francs).toBe(5000)
    expect(mission.requires.minerals).toEqual({ Water: 10 })
  })

  it('normalizes legacy M3 catalog records to one of the corrected transport-client missions', () => {
    const mission = toMission({
      slug: 'lnm_m3_ore_delivery',
      title: 'Legacy Delivery',
      contractor_slug: 'kepler-materials',
      requires_minerals: '{"nickel":2}',
      target_id: 'lutetia',
      payload_type: 'rover',
    })
    expect(mission.sequence).toBe(3)
    expect(mission.deliveryTargetId).toBeDefined()
    expect(mission.client).toBeDefined()
  })

  it('maps a raw client record with economy fields', () => {
    const client = toClient({
      slug: 'hearth-smelters',
      name: 'Hearth Smelters',
      color: '#d97150',
      initial: 'HS',
      unlock_tier: 1,
      project_type: 'Starter smelting',
      mineral_preferences: '["iron","silicon"]',
      payout_premium: 0.2,
      affinity_bonus_per_mission: 0.025,
    })
    expect(client.projectType).toBe('Starter smelting')
    expect(client.mineralPreferences).toEqual(['iron', 'silicon'])
    expect(client.payoutPremium).toBe(0.2)
  })

  it('replaces legacy contractor slot placeholders with the named client', () => {
    const client = toClient({
      slug: 'helios-propulsion-depot',
      name: 'Contractor Slot 03A',
      mineral_preferences: '["platinum"]',
    })
    expect(client.name).toBe('Helios Propulsion Depot')
  })

  it('rewrites legacy mission briefs to use the named client', () => {
    const mission = toMission({
      slug: 'm1-iron',
      title: 'Iron Reserve Order',
      contractor_slug: 'helios-propulsion-depot',
      brief: 'Contractor Slot 03A needs a starter iron shipment.',
      requires_minerals: '{}',
    })
    expect(mission.brief).toContain('Helios Propulsion Depot needs')
  })

  it('maps a raw part record with stats', () => {
    const raw = {
      slug: 'drill-t1',
      name: 'Basic Drill',
      tier: 1,
      drill_rate: 1.5
    }
    const part = toPart(raw)
    expect(part.id).toBe('drill-t1')
    expect(part.rate).toBe(1.5)
  })

  it('unlocks tier-1 and tier-2 parts regardless of locked flag', () => {
    const raw = { slug: 'hull-mk1', name: 'Hull MK1', tier: 1, locked: true }
    const unlocked = toPart(raw)
    expect(unlocked.locked).toBe(false)
  })

  it('respects locked flag for tier-3+ parts', () => {
    const raw = { slug: 'hull-mk3', name: 'Hull MK3', tier: 4, locked: true }
    const locked = toPart(raw)
    expect(locked.locked).toBe(true)
  })

  it('maps a structure blueprint with materials and unlock trigger', () => {
    const structure = toStructure({
      slug: 'refinery',
      name: 'Refinery',
      kind: 'refinery',
      cost_francs: 800_000_000,
      cost_materials: '{"aluminium":20,"copper":10}',
      unlocks_at: 'First contractor mission requiring refined minerals',
      unlock_trigger_type: 'contractor-mission-trigger',
      description: 'Refines raw ore.',
    })
    expect(structure.costMaterials).toEqual({ aluminium: 20, copper: 10 })
    expect(structure.unlockTrigger).toBe('contractor-mission-trigger')
  })
})
