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
    { slug: 'copper', name: 'Copper', sym: 'Cu', color: '#c9824b', base_price: 260, rarity: 'common', demand_role: 'conductive supply', construction_use: 'Conductors, heat exchangers, wiring', laser_access: 1 },
    { slug: 'aluminium', name: 'Aluminium', sym: 'Al', color: '#c7d0dc', base_price: 210, rarity: 'common', demand_role: 'light structural supply', construction_use: 'Lightweight frames, tanks, trusses', laser_access: 1 },
    { slug: 'hydrogen', name: 'Hydrogen', sym: 'H', color: '#9becff', base_price: 140, rarity: 'uncommon', demand_role: 'propellant logistics', construction_use: 'Propellant, reactor feedstock', laser_access: 1 },
    { slug: 'uranium', name: 'Uranium', sym: 'U', color: '#8fd16a', base_price: 1200, rarity: 'rare', demand_role: 'compact power supply', construction_use: 'Compact power systems, shielding', laser_access: 2 },
  ])

  upsert('clients', 'slug', [
    { slug: 'helios-propulsion-depot', name: 'Helios Propulsion Depot', color: '#f5a623', initial: 'HP', unlock_tier: 1, project_type: 'fuel logistics and orbital propellant reserves', mineral_preferences: JSON.stringify(['hydrogen']), payout_notes: '20% premium on hydrogen and propellant runs', affinity_notes: '+2.5% payout per completed Helios job', ui_role: 'starter' },
    { slug: 'arcturus-battery-systems', name: 'Arcturus Battery Systems', color: '#4f9cf7', initial: 'AB', unlock_tier: 1, project_type: 'energy storage manufacturing and cathode supply', mineral_preferences: JSON.stringify(['cobalt', 'copper']), payout_notes: '22% premium on cobalt and copper battery inputs', affinity_notes: '+2.5% payout per completed Arcturus job', ui_role: 'prospect' },
    { slug: 'ferrum-orbital-construction', name: 'Ferrum Orbital Construction', color: '#c7d0dc', initial: 'FO', unlock_tier: 1, project_type: 'in-space manufacturing and structural assembly', mineral_preferences: JSON.stringify(['aluminium', 'copper']), payout_notes: '18% premium on aluminium and copper construction cargo', affinity_notes: '+2% payout per completed Ferrum job', ui_role: 'bulk' },
  ])

  upsert('mission_templates', 'slug', [
    { slug: 'freeops-delivery', tag: 'DELIVERY', difficulty: 'L1', mineral_keys: JSON.stringify(['hydrogen', 'cobalt', 'copper', 'aluminium']), cargo_min: 4, cargo_max: 10, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 1.25, client_role: 'starter', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'freeops-mining-survey', tag: 'SURVEY', difficulty: 'L1', mineral_keys: JSON.stringify(['cobalt', 'copper', 'aluminium', 'gold']), cargo_min: 3, cargo_max: 7, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 1.55, client_role: 'prospect', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'freeops-bulk-run', tag: 'BULK', difficulty: 'L1', mineral_keys: JSON.stringify(['hydrogen', 'aluminium', 'copper']), cargo_min: 8, cargo_max: 16, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 1.15, client_role: 'bulk', payout_formula: 'mineral price * amount * 1500 * multiplier' },
    { slug: 'freeops-station-scan', tag: 'SCAN', difficulty: 'L1', mineral_keys: JSON.stringify(['cobalt', 'copper', 'aluminium', 'gold']), cargo_min: 0, cargo_max: 0, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 0.85, client_role: 'prospect', payout_formula: 'scan fee + mapped deposit bonus', scan_required: true, scan_count: 3, scan_source: 'station', deposits_to_map: 2, reveals_minerals: true, reveals_landmarks: JSON.stringify(['crater field', 'high-albedo ridge']), unlocks_landing: true, on_world_any_target: false },
    { slug: 'freeops-rover-landing', tag: 'ROVER', difficulty: 'L1', mineral_keys: JSON.stringify(['cobalt', 'copper', 'aluminium', 'hydrogen']), cargo_min: 2, cargo_max: 5, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 1.7, client_role: 'starter', payout_formula: 'mineral price * amount * 1500 * multiplier + landing bonus', scan_required: true, scan_count: 1, scan_source: 'rover', deposits_to_map: 1, reveals_minerals: true, reveals_landmarks: JSON.stringify(['surface deposit']), unlocks_landing: true, on_world_vehicle: 'starter-rover', on_world_any_target: true },
    { slug: 'construct-fuel-depot', tag: 'CONSTRUCT', difficulty: 'L2', mineral_keys: JSON.stringify(['hydrogen', 'aluminium', 'copper']), cargo_min: 8, cargo_max: 14, drill_tier_min: 1, orbit_max: 5, payout_multiplier: 2.8, client_role: 'prospect', payout_formula: 'structure value * 2 + delivery bonus', construction_structure_kind: 'fuel-depot', construction_required_materials: JSON.stringify({ hydrogen: 8, aluminium: 6 }), construction_placement_mode: 'confirm', construction_build_time_ms: 20 * 60 * 1000 },
    { slug: 'construct-battery-station', tag: 'CONSTRUCT', difficulty: 'L2', mineral_keys: JSON.stringify(['cobalt', 'nickel', 'copper', 'gold']), cargo_min: 8, cargo_max: 14, drill_tier_min: 2, orbit_max: 6, payout_multiplier: 3.2, client_role: 'command', payout_formula: 'structure value * 2 + delivery bonus', construction_structure_kind: 'battery-station', construction_required_materials: JSON.stringify({ cobalt: 6, nickel: 4, copper: 4 }), construction_placement_mode: 'confirm', construction_build_time_ms: 25 * 60 * 1000 },
    { slug: 'construct-fabrication-pad', tag: 'CONSTRUCT', difficulty: 'L3', mineral_keys: JSON.stringify(['iron', 'silicon', 'aluminium', 'carbon']), cargo_min: 10, cargo_max: 18, drill_tier_min: 2, orbit_max: 6, payout_multiplier: 3.6, client_role: 'bulk', payout_formula: 'structure value * 2 + delivery bonus', construction_structure_kind: 'fabrication-pad', construction_required_materials: JSON.stringify({ iron: 12, silicon: 6, aluminium: 4 }), construction_placement_mode: 'confirm', construction_build_time_ms: 35 * 60 * 1000 },
  ])
}, (app) => {
  const slugs = {
    minerals: ['copper', 'aluminium', 'hydrogen', 'uranium'],
    clients: ['helios-propulsion-depot', 'arcturus-battery-systems', 'ferrum-orbital-construction'],
    mission_templates: ['freeops-delivery', 'freeops-mining-survey', 'freeops-bulk-run', 'freeops-station-scan', 'freeops-rover-landing', 'construct-fuel-depot', 'construct-battery-station', 'construct-fabrication-pad'],
  }
  for (const [col, list] of Object.entries(slugs)) {
    const inList = list.map(s => `'${s}'`).join(',')
    try { app.db().newQuery(`DELETE FROM ${col} WHERE slug IN (${inList})`).execute() } catch {}
  }
})
