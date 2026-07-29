// STS-538: align the PocketBase schema with the client terminology already
// used by the application. The collection and field IDs are preserved; only
// their names change, so existing records and references remain intact.
migrate((app) => {
  try {
    const clients = app.findCollectionByNameOrId('clients')
    // A fresh install already has the new schema from the collection
    // migration. Nothing further is required.
    if (clients) return
  } catch {}

  let contractors
  try {
    contractors = app.findCollectionByNameOrId('contractors')
  } catch {
    return
  }

  contractors.name = 'clients'
  contractors.indexes = contractors.indexes.map(index => index.replace(/contractors/g, 'clients'))
  app.save(contractors)

  for (const [collectionName, oldName, newName] of [
    ['missions_catalog', 'contractor_slug', 'client_slug'],
    ['mission_templates', 'contractor_role', 'client_role'],
  ]) {
    try {
      const collection = app.findCollectionByNameOrId(collectionName)
      const field = collection.fields.find(candidate => candidate.name === oldName)
      if (field && !collection.fields.some(candidate => candidate.name === newName)) {
        field.name = newName
        app.save(collection)
      }
    } catch {}
  }

  try {
    const blueprints = app.findCollectionByNameOrId('structure_blueprints')
    const triggerField = blueprints.fields.find(field => field.name === 'unlock_trigger_type')
    if (triggerField) {
      triggerField.values = triggerField.values.map(value => value === 'contractor-mission-trigger' ? 'client-mission-trigger' : value)
      app.save(blueprints)
    }
  } catch {}

  try {
    app.db().newQuery("UPDATE structure_blueprints SET unlock_trigger_type = 'client-mission-trigger' WHERE unlock_trigger_type = 'contractor-mission-trigger'").execute()
  } catch {}

  try {
    app.db().newQuery("UPDATE clients SET name = REPLACE(name, 'Contractor Slot', 'Client Slot') WHERE name LIKE 'Contractor Slot %'").execute()
    app.db().newQuery("UPDATE missions_catalog SET brief = REPLACE(brief, 'Contractor Slot', 'Client Slot') WHERE brief LIKE '%Contractor Slot%'").execute()
  } catch {}
}, (app) => {
  try {
    const clients = app.findCollectionByNameOrId('clients')
    clients.name = 'contractors'
    clients.indexes = clients.indexes.map(index => index.replace(/clients/g, 'contractors'))
    app.save(clients)
  } catch {}

  for (const [collectionName, oldName, newName] of [
    ['missions_catalog', 'client_slug', 'contractor_slug'],
    ['mission_templates', 'client_role', 'contractor_role'],
  ]) {
    try {
      const collection = app.findCollectionByNameOrId(collectionName)
      const field = collection.fields.find(candidate => candidate.name === oldName)
      if (field && !collection.fields.some(candidate => candidate.name === newName)) {
        field.name = newName
        app.save(collection)
      }
    } catch {}
  }

  try {
    const blueprints = app.findCollectionByNameOrId('structure_blueprints')
    const triggerField = blueprints.fields.find(field => field.name === 'unlock_trigger_type')
    if (triggerField) {
      triggerField.values = triggerField.values.map(value => value === 'client-mission-trigger' ? 'contractor-mission-trigger' : value)
      app.save(blueprints)
    }
  } catch {}

  try {
    app.db().newQuery("UPDATE structure_blueprints SET unlock_trigger_type = 'contractor-mission-trigger' WHERE unlock_trigger_type = 'client-mission-trigger'").execute()
  } catch {}
})
