package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-655 / SSL-626: one owner-scoped screenshot proof per Orionids mission
// run. This compiled migration is what the Fly release command executes.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			return nil
		}
		if _, err := txApp.FindCollectionByNameOrId("event_proofs"); err == nil {
			return nil
		}

		owner := types.Pointer("user = @request.auth.id")
		create := types.Pointer(`@request.auth.id != "" && user = @request.auth.id`)
		col := core.NewBaseCollection("event_proofs")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = owner, owner, create, owner, owner
		col.Fields.Add(&core.RelationField{Name: "user", Required: true, MaxSelect: 1, CollectionId: users.Id, CascadeDelete: true})
		col.Fields.Add(&core.TextField{Name: "event_id", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "mission_id", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "mission_run_id", Required: true, Max: 120})
		col.Fields.Add(&core.TextField{Name: "target_id", Required: true, Max: 120})
		col.Fields.Add(&core.SelectField{Name: "proof_type", Required: true, MaxSelect: 1, Values: []string{"event-body"}})
		col.Fields.Add(&core.TextField{Name: "screenshot", Required: true, Max: 2000000})
		col.Fields.Add(&core.TextField{Name: "caption", Max: 240})
		col.Fields.Add(&core.NumberField{Name: "captured_at", Required: true})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_event_proofs_user_run_type ON event_proofs (user, mission_run_id, proof_type)"}
		return txApp.Save(col)
	}, nil)
}
