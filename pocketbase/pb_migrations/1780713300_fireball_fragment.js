// One rare Orionids fragment. Matches web MINERAL_META.fireball_fragment.
// Book value is 15× the Orionid Exchange price (1,680,000 × 0.8 = 20,160,000).
migrate((app) => {
  const col = app.findCollectionByNameOrId('minerals')
  let record
  try {
    record = app.findFirstRecordByData('minerals', 'slug', 'fireball_fragment')
  } catch {
    record = new Record(col)
    record.set('slug', 'fireball_fragment')
  }
  record.set('name', 'Fireball Fragment')
  record.set('sym', 'Fb')
  record.set('color', '#b7e3ff')
  record.set('base_price', 20160000)
  record.set('rarity', 'exotic')
  record.set('demand_role', 'event fragment')
  record.set('construction_use', 'Event fragment; sell at market')
  record.set('laser_access', 1)
  app.save(record)
}, (app) => {
  try {
    const record = app.findFirstRecordByData('minerals', 'slug', 'fireball_fragment')
    app.delete(record)
  } catch {
    // Already gone.
  }
})
