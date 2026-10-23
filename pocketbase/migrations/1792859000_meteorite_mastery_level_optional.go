package migrations

import (
	"github.com/pocketbase/pocketbase/core"
)

// SSL-651: a new player's first launch catch queues a meteorite_mastery row at level 0, and PocketBase treats 0 as
// blank for a Required NumberField, so staging answered 400 "Cannot be blank" and the row never synced.
// 1780713600_orionids_event_collections.go created the field Required; this makes it optional. Idempotent.
func relaxMasteryLevel(app core.App) error {
	col, err := app.FindCollectionByNameOrId("meteorite_mastery")
	if err != nil {
		return nil
	}
	field, ok := col.Fields.GetByName("level").(*core.NumberField)
	if !ok || !field.Required {
		return nil
	}
	field.Required = false
	return app.Save(col)
}

func init() {
	core.AppMigrations.Register(relaxMasteryLevel, nil)
}
