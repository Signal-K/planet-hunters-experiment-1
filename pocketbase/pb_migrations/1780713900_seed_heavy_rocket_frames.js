// The Surveyor is built on hull-mk3, but the rocket_parts seed never added it (or the bulk hauler frame).
// Clients fell back to the 6U starter hull when validating the Surveyor, so it read "Cannot reach this
// destination" on every job (Liam, 01.11). Web also fills missing parts from its static table.
migrate((app) => {
  const col = app.findCollectionByNameOrId('rocket_parts')
  const rows = [
    { slug: 'hull-mk3', name: 'Hull MK3 – Heavy Frame', part_type: 'chassis', tier: 3, locked: false, img: '/parts/hull_mk3_heavy_t3.png', mass: 4, cargo_capacity: 18 },
    { slug: 'hull-hauler', name: 'Bulk Hauler Chassis', part_type: 'chassis', tier: 3, locked: false, img: '/parts/bulk_hauler_t3.png', mass: 3, cargo_capacity: 24 },
  ]
  for (const row of rows) {
    let record
    try {
      record = app.findFirstRecordByData('rocket_parts', 'slug', row.slug)
    } catch {
      record = new Record(col, row)
    }
    for (const [key, value] of Object.entries(row)) record.set(key, value)
    app.save(record)
  }
}, (app) => {
  try { app.db().newQuery("DELETE FROM rocket_parts WHERE slug IN ('hull-mk3','hull-hauler')").execute() } catch {}
})
