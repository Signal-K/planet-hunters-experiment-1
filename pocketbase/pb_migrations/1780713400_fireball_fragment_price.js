// Databases that already applied 1780713300 stored the 22,000,000 book.
// The live price is 15× the Orionid Exchange price. See FIREBALL_FRAGMENT_PRICE.
migrate((app) => {
  let record
  try {
    record = app.findFirstRecordByData('minerals', 'slug', 'fireball_fragment')
  } catch {
    return
  }
  record.set('base_price', 20160000)
  app.save(record)
}, (app) => {
  let record
  try {
    record = app.findFirstRecordByData('minerals', 'slug', 'fireball_fragment')
  } catch {
    return
  }
  record.set('base_price', 22000000)
  app.save(record)
})
