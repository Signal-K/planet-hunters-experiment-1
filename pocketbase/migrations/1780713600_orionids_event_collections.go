package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-626: the Orionids collections (event_badges, meteorite_mastery) were only ever defined in
// pb_migrations/*.js (1780713200, 1780713500). The Fly image never ships that directory and jsvm is not
// registered, so they never ran and production returned 404 for both collections. This is the compiled
// equivalent. It is idempotent: a database that already has either collection is left alone, and the
// mastery fragments/redeemed fields are added when missing. Mineral rows are seeded by main.go's seedCatalog.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("orionids_event_collections: users collection not found: %v", err)
			return nil
		}
		owner := types.Pointer("user = @request.auth.id")
		create := types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		userField := func() *core.RelationField {
			return &core.RelationField{Name: "user", Required: true, MaxSelect: 1, CollectionId: users.Id, CascadeDelete: true}
		}

		if _, err := txApp.FindCollectionByNameOrId("event_badges"); err != nil {
			col := core.NewBaseCollection("event_badges")
			col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = owner, owner, create, owner, owner
			col.Fields.Add(userField())
			col.Fields.Add(&core.TextField{Name: "event_id", Required: true, Max: 80})
			col.Fields.Add(&core.SelectField{Name: "tier", Required: true, MaxSelect: 1, Values: []string{"gold", "silver"}})
			col.Fields.Add(&core.TextField{Name: "source", Required: true, Max: 40})
			col.Fields.Add(&core.NumberField{Name: "earned_at", Required: true})
			col.Fields.Add(&core.TextField{Name: "subject_id", Required: true, Max: 120})
			col.Fields.Add(&core.TextField{Name: "marker", Max: 40})
			col.Fields.Add(&core.TextField{Name: "voucher", Max: 20})
			col.Indexes = []string{"CREATE UNIQUE INDEX idx_event_badges_user_event_subject ON event_badges (user, event_id, subject_id)"}
			if err := txApp.Save(col); err != nil {
				return err
			}
		}

		mastery, err := txApp.FindCollectionByNameOrId("meteorite_mastery")
		if err != nil {
			mastery = core.NewBaseCollection("meteorite_mastery")
			mastery.ListRule, mastery.ViewRule, mastery.CreateRule, mastery.UpdateRule, mastery.DeleteRule = owner, owner, create, owner, owner
			mastery.Fields.Add(userField())
			mastery.Fields.Add(&core.NumberField{Name: "level", Required: true})
			mastery.Fields.Add(&core.TextField{Name: "source", Required: true, Max: 40})
			mastery.Fields.Add(&core.TextField{Name: "event_id", Required: true, Max: 80})
			mastery.Fields.Add(&core.NumberField{Name: "earned_at", Required: true})
			mastery.Indexes = []string{"CREATE UNIQUE INDEX idx_meteorite_mastery_user ON meteorite_mastery (user)"}
		}
		for _, name := range []string{"fragments", "redeemed"} {
			if mastery.Fields.GetByName(name) == nil {
				mastery.Fields.Add(&core.NumberField{Name: name})
			}
		}
		return txApp.Save(mastery)
	}, nil)
}
