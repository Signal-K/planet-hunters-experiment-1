migrate((app) => {
  try {
    app.findCollectionByNameOrId('structure_blueprints')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'structure_blueprints',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',                required: true, max: 40 },
        { type: 'text',   name: 'name',                required: true, max: 120 },
        { type: 'text',   name: 'kind',                required: true, max: 40 },
        { type: 'number', name: 'cost_francs' },
        { type: 'json',   name: 'cost_materials',      maxSize: 1000 },
        { type: 'select', name: 'unlock_trigger_type', maxSelect: 1, values: ['always', 'contractor-mission-trigger', 'manual'] },
        { type: 'text',   name: 'unlocks_at',          max: 200 },
        { type: 'text',   name: 'description',         max: 400 },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_structure_blueprints_slug ON structure_blueprints (slug)'],
    }))
  }

  const col = app.findCollectionByNameOrId('structure_blueprints')
  for (const row of [
    { slug: 'launchpad', name: 'Launchpad', kind: 'launchpad', cost_francs: 0, cost_materials: JSON.stringify({}), unlock_trigger_type: 'always', unlocks_at: 'always', description: 'Rocket assembly and launch operations.' },
    { slug: 'refinery', name: 'Refinery', kind: 'refinery', cost_francs: 800000000, cost_materials: JSON.stringify({ aluminium: 20, copper: 10 }), unlock_trigger_type: 'contractor-mission-trigger', unlocks_at: 'First contractor mission requiring refined minerals', description: 'Refines raw minerals into higher-value contractor-grade materials.' },
  ]) {
    let record
    try {
      record = app.findFirstRecordByData('structure_blueprints', 'slug', row.slug)
    } catch {
      record = new Record(col, row)
    }
    for (const [key, value] of Object.entries(row)) {
      record.set(key, value)
    }
    app.save(record)
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('structure_blueprints')) } catch {}
})
