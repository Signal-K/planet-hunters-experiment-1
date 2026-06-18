migrate((app) => {
  function upsert(collection, slugField, rows) {
    const col = app.findCollectionByNameOrId(collection)
    for (const row of rows) {
      let record
      try {
        record = app.findFirstRecordByData(collection, slugField, row[slugField])
      } catch {
        record = new Record(col, row)
      }
      for (const [key, value] of Object.entries(row)) {
        record.set(key, value)
      }
      app.save(record)
    }
  }

  upsert('minerals', 'slug', [
    { slug: 'iron',    name: 'Iron',    sym: 'Fe',  color: '#d97150', base_price: 120,  rarity: 'common',   demand_role: 'starter bulk',       construction_use: 'Structural frames, smelting feedstock', laser_access: 1 },
    { slug: 'silicon', name: 'Silicon', sym: 'Si',  color: '#b9d8ff', base_price: 180,  rarity: 'common',   demand_role: 'electronics bulk',   construction_use: 'Electronics, solar panels', laser_access: 1 },
    { slug: 'carbon',  name: 'Carbon',  sym: 'C',   color: '#6a7280', base_price: 60,   rarity: 'common',   demand_role: 'construction blend', construction_use: 'Composites, fuel', laser_access: 1 },
    { slug: 'ice',     name: 'Ice',     sym: 'H2O', color: '#9becff', base_price: 90,   rarity: 'uncommon', demand_role: 'volatile supply',    construction_use: 'Propellant, life support', laser_access: 1 },
    { slug: 'nickel',  name: 'Nickel',  sym: 'Ni',  color: '#b0b8c4', base_price: 150,  rarity: 'uncommon', demand_role: 'alloy demand',       construction_use: 'Alloys, battery production', laser_access: 1 },
    { slug: 'cobalt',  name: 'Cobalt',  sym: 'Co',  color: '#4f9cf7', base_price: 450,  rarity: 'uncommon', demand_role: 'battery demand',     construction_use: 'Battery cathodes, superalloys', laser_access: 2 },
    { slug: 'gold',    name: 'Gold',    sym: 'Au',  color: '#ffd166', base_price: 800,  rarity: 'rare',     demand_role: 'premium assay',      construction_use: 'Circuitry, radiation shielding', laser_access: 2 },
    { slug: 'rare',    name: 'Xenon',   sym: 'Xe',  color: '#c084ff', base_price: 2000, rarity: 'exotic',   demand_role: 'advanced propellant', construction_use: 'Quantum sensors, ion propellant', laser_access: 3 },
  ])

  upsert('contractors', 'slug', [
    { slug: 'contractor-03a', name: 'Contractor Slot 03A', color: '#d97150', initial: '3A', unlock_tier: 3,  project_type: 'starter smelting throughput', mineral_preferences: JSON.stringify(['iron', 'silicon']), payout_notes: 'Low rate, steady volume', affinity_notes: '+10 per delivery', ui_role: 'starter' },
    { slug: 'contractor-03b', name: 'Contractor Slot 03B', color: '#9becff', initial: '3B', unlock_tier: 3,  project_type: 'volatile handling', mineral_preferences: JSON.stringify(['ice', 'carbon']), payout_notes: 'Medium pay, bulk orders', affinity_notes: '+8 per delivery', ui_role: 'bulk' },
    { slug: 'contractor-04a', name: 'Contractor Slot 04A', color: '#ffd166', initial: '4A', unlock_tier: 4,  project_type: 'precious-metal assay', mineral_preferences: JSON.stringify(['gold', 'nickel']), payout_notes: 'High pay, low volume', affinity_notes: '+15 per delivery', ui_role: 'prospect' },
    { slug: 'contractor-04b', name: 'Contractor Slot 04B', color: '#a8d8ea', initial: '4B', unlock_tier: 4,  project_type: 'construction aggregates', mineral_preferences: JSON.stringify(['iron', 'carbon']), payout_notes: 'Low rate, large orders', affinity_notes: '+6 per delivery', ui_role: 'bulk' },
    { slug: 'contractor-06a', name: 'Contractor Slot 06A', color: '#70e070', initial: '6A', unlock_tier: 6,  project_type: 'deep-core sampling', mineral_preferences: JSON.stringify(['nickel', 'cobalt']), payout_notes: 'Mixed-bag premium', affinity_notes: '+12 per delivery', ui_role: 'prospect' },
    { slug: 'contractor-06b', name: 'Contractor Slot 06B', color: '#c084ff', initial: '6B', unlock_tier: 6,  project_type: 'rare-gas refining', mineral_preferences: JSON.stringify(['rare', 'gold']), payout_notes: 'High tier, small batches', affinity_notes: '+20 per delivery', ui_role: 'command' },
    { slug: 'contractor-08a', name: 'Contractor Slot 08A', color: '#ff8c42', initial: '8A', unlock_tier: 8,  project_type: 'solar-grade silicon', mineral_preferences: JSON.stringify(['silicon', 'ice']), payout_notes: 'Premium purity contracts', affinity_notes: '+10 per delivery', ui_role: 'command' },
    { slug: 'contractor-08b', name: 'Contractor Slot 08B', color: '#5fcde6', initial: '8B', unlock_tier: 8,  project_type: 'outer-belt volatiles', mineral_preferences: JSON.stringify(['ice', 'carbon']), payout_notes: 'Medium rate, special cargo', affinity_notes: '+8 per delivery', ui_role: 'bulk' },
    { slug: 'contractor-10a', name: 'Contractor Slot 10A', color: '#f5a623', initial: '10A', unlock_tier: 10, project_type: 'strategic minerals', mineral_preferences: JSON.stringify(['gold', 'rare', 'cobalt']), payout_notes: 'High payout, rare minerals', affinity_notes: '+25 per delivery', ui_role: 'science' },
    { slug: 'contractor-10b', name: 'Contractor Slot 10B', color: '#39d36a', initial: '10B', unlock_tier: 10, project_type: 'base expansion reserves', mineral_preferences: JSON.stringify(['iron', 'silicon', 'nickel']), payout_notes: 'Balanced late-game contracts', affinity_notes: '+12 per delivery', ui_role: 'starter' },
  ])

  upsert('locations', 'slug', [
    { slug: 'mercury', name: 'Mercury', body_type: 'planet', orbit: 1, difficulty: 'L2', brief: 'Scorched inner planet, rich in iron and trace silicates.', minerals: JSON.stringify(['iron', 'silicon']), recommended: false },
    { slug: 'mars', name: 'Mars', body_type: 'planet', orbit: 4, difficulty: 'L1', brief: 'Iron-rich rusty plains, well-mapped, starter-friendly.', minerals: JSON.stringify(['iron', 'silicon']), recommended: true },
    { slug: 'jupiter', name: 'Jupiter', body_type: 'planet', orbit: 6, difficulty: 'L3', brief: 'Gas giant moons, ice and silicate rich, high gravity penalty.', minerals: JSON.stringify(['ice', 'silicon']), recommended: false },
    { slug: 'eros', name: '433 Eros', body_type: 'asteroid', orbit: 2, difficulty: 'L1', brief: 'Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.', minerals: JSON.stringify(['iron', 'silicon']), recommended: true },
    { slug: 'bennu', name: '101955 Bennu', body_type: 'asteroid', orbit: 2, difficulty: 'L1', brief: 'Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.', minerals: JSON.stringify(['iron', 'carbon']), recommended: false },
    { slug: 'itokawa', name: '25143 Itokawa', body_type: 'asteroid', orbit: 2, difficulty: 'L1', brief: 'Stony near-Earth rubble pile with accessible nickel-iron traces.', minerals: JSON.stringify(['iron', 'nickel']), recommended: false },
    { slug: 'ryugu', name: '162173 Ryugu', body_type: 'asteroid', orbit: 3, difficulty: 'L1', brief: 'Carbonaceous near-Earth asteroid with hydrated minerals and dark regolith.', minerals: JSON.stringify(['carbon', 'ice']), recommended: false },
    { slug: 'vesta', name: '4 Vesta', body_type: 'asteroid', orbit: 3, difficulty: 'L1', brief: 'Differentiated protoplanet. Basaltic crust over a heavy iron mantle.', minerals: JSON.stringify(['iron', 'silicon']), recommended: false },
    { slug: 'psyche', name: '16 Psyche', body_type: 'asteroid', orbit: 4, difficulty: 'L2', brief: 'Exposed metallic core of an ancient body. Extremely high iron and nickel grades.', minerals: JSON.stringify(['iron', 'nickel', 'gold']), recommended: false },
    { slug: 'belt', name: 'Asteroid Belt', body_type: 'asteroid', orbit: 5, difficulty: 'L2', brief: 'Varied deposits: iron, silicon, nickel, cobalt, gold, and xenon pockets. The prospector\'s playground.', minerals: JSON.stringify(['iron', 'silicon', 'nickel', 'cobalt', 'gold', 'rare']), recommended: true },
    { slug: 'ceres', name: '1 Ceres', body_type: 'asteroid', orbit: 5, difficulty: 'L2', brief: 'Dwarf planet at the belt\'s inner edge. Ice-rich mantle beneath a silicate crust.', minerals: JSON.stringify(['ice', 'silicon']), recommended: false },
  ])

  upsert('rocket_parts', 'slug', [
    { slug: 'hull-mk1', name: 'Hull MK1', part_type: 'chassis', tier: 1, locked: false, img: '/parts/basic_hull_t1.png', mass: 2, cargo_capacity: 6 },
    { slug: 'hull-mk2', name: 'SR2 Unibody Frame', part_type: 'chassis', tier: 2, locked: false, img: '/parts/reinforced_hull_t2.png', mass: 3, cargo_capacity: 10 },
    { slug: 'hull-cargo', name: 'Cargo Bay T1', part_type: 'chassis', tier: 1, locked: false, img: '/parts/cargo_bay_t1.png', mass: 2, cargo_capacity: 14 },
    { slug: 'ion-a1', name: 'Ion Drive A1', part_type: 'propulsion', tier: 1, locked: false, img: '/parts/basic_thruster_t1.png', power: 40, max_orbit: 5 },
    { slug: 'fusion-b2', name: 'Fusion Drive B2', part_type: 'propulsion', tier: 2, locked: false, img: '/parts/fusion_drive_t2.png', power: 80, max_orbit: 7 },
    { slug: 'ion-a3', name: 'Ion Drive A3', part_type: 'propulsion', tier: 3, locked: true, img: '/parts/ion_drive_t3.png', power: 120, max_orbit: 9 },
    { slug: 'hand-drill', name: 'Hand Drill', part_type: 'drill', tier: 1, locked: false, img: '/parts/mining_drill_t1.png', drill_rate: 1 },
    { slug: 'laser-t2', name: 'Laser T2', part_type: 'drill', tier: 2, locked: false, img: '/parts/mining_drill_t1.png', drill_rate: 2 },
    { slug: 'plasma-t3', name: 'Plasma T3', part_type: 'drill', tier: 3, locked: true, img: '/parts/mining_drill_t1.png', drill_rate: 4 },
  ])

  upsert('mission_templates', 'slug', [
    { slug: 'starter-bulk', tag: 'STARTER', difficulty: 'L1', mineral_keys: JSON.stringify(['iron', 'silicon', 'carbon']), cargo_min: 4, cargo_max: 8, drill_tier_min: 1, orbit_max: 4, payout_multiplier: 1.0, contractor_role: 'starter', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'volatile-bulk', tag: 'BULK', difficulty: 'L2', mineral_keys: JSON.stringify(['ice', 'carbon', 'silicon']), cargo_min: 8, cargo_max: 14, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 1.35, contractor_role: 'bulk', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'metal-prospect', tag: 'PROSPECT', difficulty: 'L2', mineral_keys: JSON.stringify(['nickel', 'cobalt', 'gold']), cargo_min: 3, cargo_max: 8, drill_tier_min: 2, orbit_max: 5, payout_multiplier: 2.25, contractor_role: 'prospect', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'command-reserve', tag: 'COMMAND', difficulty: 'L3', mineral_keys: JSON.stringify(['gold', 'rare', 'cobalt']), cargo_min: 3, cargo_max: 6, drill_tier_min: 2, orbit_max: 6, payout_multiplier: 3.5, contractor_role: 'command', payout_formula: 'mineral price * amount * 1500 * multiplier' },
  ])

  upsert('missions_catalog', 'slug', [
    { slug: 'm1-iron', title: 'Iron Reserve Order', contractor_slug: 'contractor-03a', brief: 'Contractor Slot 03A needs a starter iron shipment from a reachable asteroid.', tag: 'STARTER', difficulty: 'L1', locked: false, sequence: 1, unlock_at: '', requires_minerals: JSON.stringify({ iron: 6 }), requires_cargo_min: 6, requires_drill_tier: 1, requires_max_orbit: 4, payout_francs: 1080000, payout_xp: 108, payout_affinity: 10 },
    { slug: 'm2-silicon', title: 'Silicon Bulk Order', contractor_slug: 'contractor-03b', brief: 'Contractor Slot 03B needs raw silicon for electronics-grade supply contracts.', tag: 'BULK', difficulty: 'L2', locked: false, sequence: 2, unlock_at: 'Complete M1', requires_minerals: JSON.stringify({ silicon: 8 }), requires_cargo_min: 8, requires_drill_tier: 1, requires_max_orbit: 5, payout_francs: 2916000, payout_xp: 291.6, payout_affinity: 8 },
  ])
}, (app) => {
  const slugs = {
    locations: ['mercury', 'mars', 'jupiter', 'eros', 'bennu', 'itokawa', 'ryugu', 'vesta', 'psyche', 'belt', 'ceres'],
    minerals: ['iron', 'silicon', 'carbon', 'ice', 'nickel', 'cobalt', 'gold', 'rare'],
    contractors: ['contractor-03a', 'contractor-03b', 'contractor-04a', 'contractor-04b', 'contractor-06a', 'contractor-06b', 'contractor-08a', 'contractor-08b', 'contractor-10a', 'contractor-10b'],
    rocket_parts: ['hull-mk1', 'hull-mk2', 'hull-cargo', 'ion-a1', 'fusion-b2', 'ion-a3', 'hand-drill', 'laser-t2', 'plasma-t3'],
    mission_templates: ['starter-bulk', 'volatile-bulk', 'metal-prospect', 'command-reserve'],
    missions_catalog: ['m1-iron', 'm2-silicon'],
  }
  for (const [col, list] of Object.entries(slugs)) {
    const inList = list.map(s => `'${s}'`).join(',')
    try { app.db().newQuery(`DELETE FROM ${col} WHERE slug IN (${inList})`).execute() } catch {}
  }
})
