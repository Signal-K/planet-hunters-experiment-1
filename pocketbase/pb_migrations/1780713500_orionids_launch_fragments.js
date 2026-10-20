// SSL-578: fragments are a modest bonus, and the fireball stays 15× one fragment.
// Leonids (17 Nov) and Geminids (13-14 Dec) share that book price.
// meteorite_mastery stores the caught and redeemed counts.

migrate((app) => {
  let minerals
  try { minerals = app.findCollectionByNameOrId('minerals') } catch { minerals = null }

  function upsertMineral(slug, fields) {
    if (!minerals) return
    let record
    try {
      record = app.findFirstRecordByData('minerals', 'slug', slug)
    } catch {
      record = new Record(minerals)
      record.set('slug', slug)
    }
    for (const [key, value] of Object.entries(fields)) record.set(key, value)
    app.save(record)
  }

  upsertMineral('orionid_debris', {
    name: 'Orionid Debris', sym: 'Od', color: '#7fd8ff', base_price: 120000,
    rarity: 'uncommon', demand_role: 'event debris', construction_use: 'Event debris; sell at market', laser_access: 1,
  })
  upsertMineral('fireball_fragment', {
    name: 'Fireball Fragment', sym: 'Fb', color: '#b7e3ff', base_price: 1800000,
    rarity: 'exotic', demand_role: 'event fragment', construction_use: 'Event fragment; sell at market', laser_access: 1,
  })
  upsertMineral('leonid_debris', {
    name: 'Leonid Debris', sym: 'Ld', color: '#9fd6e4', base_price: 120000,
    rarity: 'uncommon', demand_role: 'event debris', construction_use: 'Event debris; sell at market', laser_access: 1,
  })
  upsertMineral('geminid_debris', {
    name: 'Geminid Debris', sym: 'Gd', color: '#b7e3ff', base_price: 120000,
    rarity: 'uncommon', demand_role: 'event debris', construction_use: 'Event debris; sell at market', laser_access: 1,
  })

  let mastery
  try { mastery = app.findCollectionByNameOrId('meteorite_mastery') } catch { return }
  let changed = false
  if (!mastery.fields.getByName('fragments')) {
    mastery.fields.add(new NumberField({ name: 'fragments' }))
    changed = true
  }
  if (!mastery.fields.getByName('redeemed')) {
    mastery.fields.add(new NumberField({ name: 'redeemed' }))
    changed = true
  }
  if (changed) app.save(mastery)
}, (app) => {
  let mastery
  try { mastery = app.findCollectionByNameOrId('meteorite_mastery') } catch { mastery = null }
  if (mastery) {
    for (const name of ['fragments', 'redeemed']) {
      const field = mastery.fields.getByName(name)
      if (field) mastery.fields.removeById(field.id)
    }
    app.save(mastery)
  }
  for (const slug of ['leonid_debris', 'geminid_debris']) {
    try { app.delete(app.findFirstRecordByData('minerals', 'slug', slug)) } catch { /* already gone */ }
  }
})
