migrate((app) => {
  let users
  try {
    users = app.findCollectionByNameOrId('users')
  } catch {
    users = new Collection({
      type: 'auth',
      name: 'users',
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id',
      manageRule: 'id = @request.auth.id',
      fields: [
        { type: 'text', name: 'displayName', max: 80 },
      ],
      passwordAuth: { enabled: true },
    })
    app.save(users)
  }

  let gameStates
  try {
    gameStates = app.findCollectionByNameOrId('game_states')
  } catch {
    gameStates = new Collection({
      type: 'base',
      name: 'game_states',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'relation', name: 'user', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: 'json', name: 'state', required: true, maxSize: 200000 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_game_states_user ON game_states (user)',
      ],
    })
    app.save(gameStates)
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('game_states')) } catch {}
  try { app.delete(app.findCollectionByNameOrId('users')) } catch {}
})
