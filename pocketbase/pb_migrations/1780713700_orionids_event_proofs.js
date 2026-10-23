// Orionids event-body evidence (SSL-655 / SSL-626).
// One compact scene proof is queued when an Orionid body is collected.
migrate((app) => {
  let users
  try { users = app.findCollectionByNameOrId('users') } catch { return }
  try { app.findCollectionByNameOrId('event_proofs'); return } catch {}

  app.save(new Collection({
    type: 'base',
    name: 'event_proofs',
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
    fields: [
      { type: 'relation', name: 'user', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { type: 'text', name: 'event_id', required: true, max: 80 },
      { type: 'text', name: 'mission_id', required: true, max: 120 },
      { type: 'text', name: 'mission_run_id', required: true, max: 120 },
      { type: 'text', name: 'target_id', required: true, max: 120 },
      { type: 'select', name: 'proof_type', required: true, maxSelect: 1, values: ['event-body'] },
      { type: 'text', name: 'screenshot', required: true, max: 2000000 },
      { type: 'text', name: 'caption', max: 240 },
      { type: 'number', name: 'captured_at', required: true },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_event_proofs_user_run_type ON event_proofs (user, mission_run_id, proof_type)',
    ],
  }))
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('event_proofs')) } catch {}
})
