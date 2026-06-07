migrate((app) => {
  function upsert(collection, slugField, rows) {
    const col = app.findCollectionByNameOrId(collection)
    for (const row of rows) {
      try {
        app.findFirstRecordByData(collection, slugField, row[slugField])
      } catch {
        app.save(new Record(col, row))
      }
    }
  }

  upsert('minerals', 'slug', [
    { slug: 'iron',    name: 'Iron',    sym: 'Fe',  color: '#d97150', base_price: 120 },
    { slug: 'silicon', name: 'Silicon', sym: 'Si',  color: '#b9d8ff', base_price: 180 },
    { slug: 'ice',     name: 'Ice',     sym: 'H2O', color: '#9becff', base_price: 90  },
    { slug: 'carbon',  name: 'Carbon',  sym: 'C',   color: '#6a7280', base_price: 60  },
    { slug: 'gold',    name: 'Gold',    sym: 'Au',  color: '#ffd166', base_price: 800 },
    { slug: 'rare',    name: 'Rare',    sym: 'Xe',  color: '#c084ff', base_price: 2000 },
  ])

  upsert('contractors', 'slug', [
    { slug: 'foundry3', name: 'Foundry-3 Corp', color: '#d97150', initial: 'F3', unlock_tier: 1 },
    { slug: 'cryos',    name: 'Cryos Mining',   color: '#9becff', initial: 'CM', unlock_tier: 1 },
    { slug: 'beltgold', name: 'Belt Gold Ltd',  color: '#ffd166', initial: 'BG', unlock_tier: 3 },
  ])

  upsert('locations', 'slug', [
    // Planets
    { slug: 'mercury', name: 'Mercury',       body_type: 'planet',   orbit: 1, difficulty: 'L2', brief: 'Scorched inner planet, rich in iron and trace silicates.',                                                   minerals: JSON.stringify(['iron', 'silicon']),        recommended: false },
    { slug: 'mars',    name: 'Mars',          body_type: 'planet',   orbit: 4, difficulty: 'L1', brief: 'Iron-rich rusty plains, well-mapped, starter-friendly.',                                                     minerals: JSON.stringify(['iron', 'silicon']),        recommended: true  },
    { slug: 'jupiter', name: 'Jupiter',       body_type: 'planet',   orbit: 6, difficulty: 'L3', brief: 'Gas giant moons, ice and silicate rich, high gravity penalty.',                                             minerals: JSON.stringify(['ice', 'silicon']),         recommended: false },
    // Near-Earth and inner belt asteroids
    { slug: 'eros',    name: '433 Eros',      body_type: 'asteroid', orbit: 2, difficulty: 'L1', brief: 'Elongated near-Earth rock with dense iron-nickel core. First commercial prospect on file.',                  minerals: JSON.stringify(['iron', 'silicon']),        recommended: true  },
    { slug: 'bennu',   name: '101955 Bennu',  body_type: 'asteroid', orbit: 2, difficulty: 'L1', brief: 'Carbon-rich near-Earth asteroid. Loose rubble pile, low gravity, easy approach.',                           minerals: JSON.stringify(['iron', 'carbon']),         recommended: false },
    { slug: 'vesta',   name: '4 Vesta',       body_type: 'asteroid', orbit: 3, difficulty: 'L1', brief: 'Differentiated protoplanet. Basaltic crust over a heavy iron mantle.',                                       minerals: JSON.stringify(['iron', 'silicon']),        recommended: false },
    { slug: 'psyche',  name: '16 Psyche',     body_type: 'asteroid', orbit: 4, difficulty: 'L2', brief: 'Exposed metallic core of an ancient body. Extremely high iron and nickel grades.',                           minerals: JSON.stringify(['iron', 'silicon', 'gold']),recommended: false },
    // Main belt / outer
    { slug: 'belt',    name: 'Asteroid Belt', body_type: 'asteroid', orbit: 5, difficulty: 'L2', brief: 'Varied deposits — iron, silicon, gold, rare. The prospector\'s playground.',                                minerals: JSON.stringify(['iron', 'silicon', 'gold', 'rare']), recommended: true },
    { slug: 'ceres',   name: '1 Ceres',       body_type: 'asteroid', orbit: 5, difficulty: 'L2', brief: 'Dwarf planet at the belt\'s inner edge. Ice-rich mantle beneath a silicate crust.',                         minerals: JSON.stringify(['ice', 'silicon']),         recommended: false },
    // TESS candidate
    { slug: 'tess-451b', name: 'TESS-451 b',  body_type: 'asteroid', orbit: 5, difficulty: 'L3', brief: 'Transit candidate selected by the science team. Spectral returns indicate gold and rare compounds.',        minerals: JSON.stringify(['gold', 'rare']),           recommended: true  },
  ])

  upsert('rocket_parts', 'slug', [
    // Chassis
    { slug: 'hull-mk1',   name: 'Hull MK1',      part_type: 'chassis',   tier: 1, locked: false, img: '/parts/basic_hull_t1.png',      mass: 2, cargo_capacity: 6  },
    { slug: 'hull-mk2',   name: 'Hull MK2',      part_type: 'chassis',   tier: 2, locked: false, img: '/parts/reinforced_hull_t2.png', mass: 3, cargo_capacity: 10 },
    { slug: 'hull-cargo', name: 'Cargo Bay T1',  part_type: 'chassis',   tier: 1, locked: false, img: '/parts/cargo_bay_t1.png',       mass: 2, cargo_capacity: 14 },
    // Propulsion
    { slug: 'ion-a1',    name: 'Ion Drive A1',   part_type: 'propulsion', tier: 1, locked: false, img: '/parts/basic_thruster_t1.png', power: 40,  max_orbit: 5 },
    { slug: 'fusion-b2', name: 'Fusion Drive B2',part_type: 'propulsion', tier: 2, locked: false, img: '/parts/fusion_drive_t2.png',   power: 80,  max_orbit: 7 },
    { slug: 'ion-a3',    name: 'Ion Drive A3',   part_type: 'propulsion', tier: 3, locked: true,  img: '/parts/ion_drive_t3.png',      power: 120, max_orbit: 9 },
    // Drills
    { slug: 'hand-drill', name: 'Hand Drill',    part_type: 'drill', tier: 1, locked: false, img: '/parts/mining_drill_t1.png', drill_rate: 1 },
    { slug: 'laser-t2',   name: 'Laser T2',      part_type: 'drill', tier: 2, locked: false, img: '/parts/mining_drill_t1.png', drill_rate: 2 },
    { slug: 'plasma-t3',  name: 'Plasma T3',     part_type: 'drill', tier: 3, locked: true,  img: '/parts/mining_drill_t1.png', drill_rate: 4 },
  ])

  upsert('missions_catalog', 'slug', [
    {
      slug: 'm1-iron', title: 'Iron for Foundry-3', contractor_slug: 'foundry3',
      brief: 'Foundry-3 needs a fresh iron shipment to keep their smelters running. Belt region preferred.',
      tag: 'STARTER', difficulty: 'L1', locked: false, sequence: 1,
      requires_classification: false, unlock_at: '',
      requires_minerals: JSON.stringify({ iron: 6 }),
      requires_cargo_min: 6, requires_drill_tier: 1, requires_max_orbit: 4,
      payout_francs: 1200000, payout_xp: 120, payout_affinity: 10,
    },
    {
      slug: 'm2-silicon', title: 'Silicon Mass Order', contractor_slug: 'cryos',
      brief: 'Cryos needs raw silicon for their electronics division. Any asteroid source accepted.',
      tag: 'BULK', difficulty: 'L2', locked: false, sequence: 2,
      requires_classification: false, unlock_at: 'Complete M1',
      requires_minerals: JSON.stringify({ silicon: 8 }),
      requires_cargo_min: 8, requires_drill_tier: 1, requires_max_orbit: 5,
      payout_francs: 1800000, payout_xp: 180, payout_affinity: 8,
    },
    {
      slug: 'm3-gold', title: 'Belt Gold Prospect', contractor_slug: 'beltgold',
      brief: 'Belt Gold Ltd runs a premium grade — they want gold ore from the outer belt.',
      tag: 'PROSPECT', difficulty: 'L3', locked: true, sequence: 3,
      requires_classification: true, unlock_at: 'Complete M2',
      requires_minerals: JSON.stringify({ gold: 4 }),
      requires_cargo_min: 4, requires_drill_tier: 2, requires_max_orbit: 6,
      payout_francs: 4500000, payout_xp: 450, payout_affinity: 15,
    },
    {
      slug: 'm4-rare', title: 'Signal in the Dark', contractor_slug: 'cryos',
      brief: 'A confirmed transit candidate needs a surface assay. Choose any reachable body and bring back rare material.',
      tag: 'COMMAND', difficulty: 'L3', locked: true, sequence: 4,
      requires_classification: false, unlock_at: 'Complete M3',
      requires_minerals: JSON.stringify({ rare: 4 }),
      requires_cargo_min: 4, requires_drill_tier: 2, requires_max_orbit: 6,
      payout_francs: 6200000, payout_xp: 620, payout_affinity: 20,
    },
  ])
}, (app) => {
  const slugs = {
    locations:       ['mercury','mars','jupiter','eros','bennu','vesta','psyche','belt','ceres','tess-451b'],
    minerals:        ['iron','silicon','ice','carbon','gold','rare'],
    contractors:     ['foundry3','cryos','beltgold'],
    rocket_parts:    ['hull-mk1','hull-mk2','hull-cargo','ion-a1','fusion-b2','ion-a3','hand-drill','laser-t2','plasma-t3'],
    missions_catalog:['m1-iron','m2-silicon','m3-gold','m4-rare'],
  }
  for (const [col, list] of Object.entries(slugs)) {
    const inList = list.map(s => `'${s}'`).join(',')
    try { app.db().newQuery(`DELETE FROM ${col} WHERE slug IN (${inList})`).execute() } catch {}
  }
})
