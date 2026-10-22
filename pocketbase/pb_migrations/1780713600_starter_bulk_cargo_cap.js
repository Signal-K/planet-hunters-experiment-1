// SSL-647: the first contract came from starter-bulk (cargo 4 to 8) and could ask for 7U or 8U, more than the free
// Explorer's 6U hold. Databases that already seeded the template stored cargo_max 8.
migrate((app) => {
  let record
  try {
    record = app.findFirstRecordByData('mission_templates', 'slug', 'starter-bulk')
  } catch {
    return
  }
  record.set('cargo_max', 6)
  app.save(record)
}, (app) => {
  let record
  try {
    record = app.findFirstRecordByData('mission_templates', 'slug', 'starter-bulk')
  } catch {
    return
  }
  record.set('cargo_max', 8)
  app.save(record)
})
