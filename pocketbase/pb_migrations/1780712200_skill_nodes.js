migrate((app) => {
  try {
    app.findCollectionByNameOrId('skill_nodes')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'skill_nodes',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',        required: true, max: 40 },
        { type: 'text',   name: 'name',        required: true, max: 120 },
        { type: 'select', name: 'branch',      required: true, maxSelect: 1, values: ['mining', 'cargo', 'range'] },
        { type: 'number', name: 'cost',        required: true },
        { type: 'text',   name: 'description', max: 300 },
        { type: 'text',   name: 'effect_key',  required: true, max: 80 },
        { type: 'number', name: 'effect_value' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_skill_nodes_slug ON skill_nodes (slug)'],
    }))
  }

  const col = app.findCollectionByNameOrId('skill_nodes')
  for (const row of [
    { slug: 'laser-charge-1', name: 'Laser Charge I', branch: 'mining', cost: 1, description: 'Mining laser starts each mission with +2 charges.', effect_key: 'laser_charge_cap_bonus', effect_value: 2 },
    { slug: 'cargo-slot-1', name: 'Cargo Slot I', branch: 'cargo', cost: 1, description: 'Cargo capacity is increased by 20%.', effect_key: 'cargo_capacity_multiplier', effect_value: 1.2 },
    { slug: 'near-range-1', name: 'Near-Range I', branch: 'range', cost: 2, description: 'L1 travel time is reduced by 15% and near-range reach improves.', effect_key: 'near_range_efficiency', effect_value: 0.85 },
  ]) {
    let record
    try {
      record = app.findFirstRecordByData('skill_nodes', 'slug', row.slug)
    } catch {
      record = new Record(col, row)
    }
    for (const [key, value] of Object.entries(row)) {
      record.set(key, value)
    }
    app.save(record)
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('skill_nodes')) } catch {}
})
