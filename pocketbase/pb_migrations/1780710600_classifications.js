migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  try {
    app.findCollectionByNameOrId('classifications')
  } catch {
    const classifications = new Collection({
      type: 'base',
      name: 'classifications',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'relation', name: 'user', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: 'text', name: 'candidate', required: true, max: 80 },
        { type: 'select', name: 'verdict', required: true, maxSelect: 1, values: ['planet', 'not_planet'] },
      ],
      indexes: [
        'CREATE INDEX idx_classifications_user_candidate ON classifications (user, candidate)',
      ],
    })
    app.save(classifications)
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('classifications')) } catch {}
})
