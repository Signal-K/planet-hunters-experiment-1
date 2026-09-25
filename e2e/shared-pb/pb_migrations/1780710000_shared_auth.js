migrate((app) => {
  try {
    app.findCollectionByNameOrId('users')
    return
  } catch {}

  const users = new Collection({
    type: 'auth',
    name: 'users',
    listRule: 'id = @request.auth.id',
    viewRule: 'id = @request.auth.id',
    createRule: '',
    updateRule: 'id = @request.auth.id',
    deleteRule: 'id = @request.auth.id',
    manageRule: 'id = @request.auth.id',
    fields: [{ type: 'text', name: 'displayName', max: 80 }],
    passwordAuth: { enabled: true },
  })
  app.save(users)
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('users')) } catch {}
})
