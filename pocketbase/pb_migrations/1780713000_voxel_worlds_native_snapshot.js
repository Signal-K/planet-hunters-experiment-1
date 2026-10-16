// SSL-559: native iOS stores the Takeon engine snapshot beside the web-shaped world
// so another iOS device can resume exactly. Additive and optional: web ignores it.
migrate((app) => {
  let col
  try { col = app.findCollectionByNameOrId('voxel_worlds') } catch { return }
  if (col.fields.getByName('snapshot')) return
  col.fields.add(new TextField({ name: 'snapshot', max: 2000000 }))
  app.save(col)
}, (app) => {
  let col
  try { col = app.findCollectionByNameOrId('voxel_worlds') } catch { return }
  const f = col.fields.getByName('snapshot')
  if (f) { col.fields.removeById(f.id); app.save(col) }
})
