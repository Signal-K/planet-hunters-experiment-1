migrate((app) => {
  const updates = [
    { slug: 'itokawa', minerals: ['iron', 'nickel', 'copper'] },
    { slug: 'psyche', minerals: ['iron', 'nickel', 'gold', 'cobalt'] },
    { slug: 'belt', minerals: ['iron', 'silicon', 'nickel', 'cobalt', 'gold', 'rare', 'copper', 'aluminium', 'hydrogen', 'uranium'] },
  ]
  for (const update of updates) {
    try {
      const record = app.findFirstRecordByData('locations', 'slug', update.slug)
      record.set('minerals', JSON.stringify(update.minerals))
      app.save(record)
    } catch {}
  }
}, (app) => {
  const updates = [
    { slug: 'itokawa', minerals: ['iron', 'nickel'] },
    { slug: 'psyche', minerals: ['iron', 'nickel', 'gold'] },
    { slug: 'belt', minerals: ['iron', 'silicon', 'nickel', 'cobalt', 'gold', 'rare'] },
  ]
  for (const update of updates) {
    try {
      const record = app.findFirstRecordByData('locations', 'slug', update.slug)
      record.set('minerals', JSON.stringify(update.minerals))
      app.save(record)
    } catch {}
  }
})
