// Orionid debris mineral, matching web/lib/data/minerals.ts and Minerals.swift.
migrate((app) => {
  const col = app.findCollectionByNameOrId('minerals')
  let record
  try {
    record = app.findFirstRecordByData('minerals', 'slug', 'orionid_debris')
  } catch {
    record = new Record(col)
    record.set('slug', 'orionid_debris')
  }
  record.set('name', 'Orionid Debris')
  record.set('sym', 'Od')
  record.set('color', '#7fd8ff')
  record.set('base_price', 1680000)
  record.set('rarity', 'uncommon')
  record.set('demand_role', 'event debris')
  record.set('construction_use', 'Event debris; sell at market')
  record.set('laser_access', 1)
  app.save(record)
}, (app) => {
  try {
    const record = app.findFirstRecordByData('minerals', 'slug', 'orionid_debris')
    app.delete(record)
  } catch {
    // Already gone.
  }
})
