migrate((app) => {
  // locations (mining targets)
  try {
    app.findCollectionByNameOrId('locations')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'locations',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',      required: true, max: 80 },
        { type: 'text',   name: 'name',      required: true, max: 120 },
        { type: 'select', name: 'body_type', required: true, maxSelect: 1, values: ['planet', 'asteroid'] },
        { type: 'number', name: 'orbit',     required: true },
        { type: 'text',   name: 'difficulty',required: true, max: 10 },
        { type: 'text',   name: 'brief',     max: 400 },
        { type: 'json',   name: 'minerals',  maxSize: 2000 },
        { type: 'bool',   name: 'recommended' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_locations_slug ON locations (slug)'],
    }))
  }

  // minerals
  try {
    app.findCollectionByNameOrId('minerals')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'minerals',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',       required: true, max: 40 },
        { type: 'text',   name: 'name',       required: true, max: 80 },
        { type: 'text',   name: 'sym',        required: true, max: 10 },
        { type: 'text',   name: 'color',      required: true, max: 20 },
        { type: 'number', name: 'base_price', required: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_minerals_slug ON minerals (slug)'],
    }))
  }

  // contractors
  try {
    app.findCollectionByNameOrId('contractors')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'contractors',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',        required: true, max: 40 },
        { type: 'text',   name: 'name',        required: true, max: 120 },
        { type: 'text',   name: 'color',       required: true, max: 20 },
        { type: 'text',   name: 'initial',     required: true, max: 5 },
        { type: 'number', name: 'unlock_tier' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_contractors_slug ON contractors (slug)'],
    }))
  }

  // rocket_parts
  try {
    app.findCollectionByNameOrId('rocket_parts')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'rocket_parts',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',          required: true, max: 40 },
        { type: 'text',   name: 'name',          required: true, max: 120 },
        { type: 'select', name: 'part_type',     required: true, maxSelect: 1, values: ['chassis', 'propulsion', 'drill'] },
        { type: 'number', name: 'tier',          required: true },
        { type: 'bool',   name: 'locked' },
        { type: 'text',   name: 'img',           max: 200 },
        { type: 'number', name: 'mass' },
        { type: 'number', name: 'cargo_capacity' },
        { type: 'number', name: 'power' },
        { type: 'number', name: 'max_orbit' },
        { type: 'number', name: 'drill_rate' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_rocket_parts_slug ON rocket_parts (slug)'],
    }))
  }

  // missions_catalog
  try {
    app.findCollectionByNameOrId('missions_catalog')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'missions_catalog',
      listRule: '',
      viewRule: '',
      fields: [
        { type: 'text',   name: 'slug',                  required: true, max: 40 },
        { type: 'text',   name: 'title',                 required: true, max: 200 },
        { type: 'text',   name: 'brief',                 max: 500 },
        { type: 'text',   name: 'contractor_slug',       required: true, max: 40 },
        { type: 'text',   name: 'tag',                   max: 40 },
        { type: 'text',   name: 'difficulty',            max: 10 },
        { type: 'bool',   name: 'locked' },
        { type: 'number', name: 'sequence',              required: true },
        { type: 'bool',   name: 'requires_classification' },
        { type: 'text',   name: 'unlock_at',             max: 100 },
        { type: 'json',   name: 'requires_minerals',     maxSize: 1000 },
        { type: 'number', name: 'requires_cargo_min' },
        { type: 'number', name: 'requires_drill_tier' },
        { type: 'number', name: 'requires_max_orbit' },
        { type: 'number', name: 'payout_francs' },
        { type: 'number', name: 'payout_xp' },
        { type: 'number', name: 'payout_affinity' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_missions_catalog_slug ON missions_catalog (slug)'],
    }))
  }
}, (app) => {
  for (const name of ['missions_catalog', 'rocket_parts', 'contractors', 'minerals', 'locations']) {
    try { app.delete(app.findCollectionByNameOrId(name)) } catch {}
  }
})
