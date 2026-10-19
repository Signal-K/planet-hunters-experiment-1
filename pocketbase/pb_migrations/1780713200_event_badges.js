// Shared event badges and meteorite mastery (SSL-578).
//
// Atlas agent bc-2ccacfd8 was not accessible when this was written, and the
// hub PocketBase checkout is not in this repo. This migration defines the
// schema that agent was asked to share, so Landnam and Atlas can read the
// same rows when they use this database:
//   event_badges: event_id, tier (gold|silver), source, earned_at
//   meteorite_mastery: level per user, with the same source and event_id
// earned_at is unix milliseconds. A voucher is an event_badges row with
// marker "orionids-found" and voucher "owned". Redeem is not implemented.

migrate((app) => {
  let users
  try {
    users = app.findCollectionByNameOrId('users')
  } catch {
    return
  }

  try {
    app.findCollectionByNameOrId('event_badges')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'event_badges',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'relation', name: 'user', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: 'text', name: 'event_id', required: true, max: 80 },
        { type: 'select', name: 'tier', required: true, maxSelect: 1, values: ['gold', 'silver'] },
        { type: 'text', name: 'source', required: true, max: 40 },
        { type: 'number', name: 'earned_at', required: true },
        { type: 'text', name: 'subject_id', required: true, max: 120 },
        { type: 'text', name: 'marker', max: 40 },
        { type: 'text', name: 'voucher', max: 20 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_event_badges_user_event_subject ON event_badges (user, event_id, subject_id)',
      ],
    }))
  }

  try {
    app.findCollectionByNameOrId('meteorite_mastery')
  } catch {
    app.save(new Collection({
      type: 'base',
      name: 'meteorite_mastery',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { type: 'relation', name: 'user', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: 'number', name: 'level', required: true },
        { type: 'text', name: 'source', required: true, max: 40 },
        { type: 'text', name: 'event_id', required: true, max: 80 },
        { type: 'number', name: 'earned_at', required: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_meteorite_mastery_user ON meteorite_mastery (user)',
      ],
    }))
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('meteorite_mastery')) } catch {}
  try { app.delete(app.findCollectionByNameOrId('event_badges')) } catch {}
})
