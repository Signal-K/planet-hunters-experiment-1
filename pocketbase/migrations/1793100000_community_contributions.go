package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-758: the Community Site ledger. One row per player per run per project; the
// client picks a deterministic id from (user, project, run), so a replayed run lands
// once and the unique index backs that up. Players create and read their own rows;
// the create hook in site.go clamps every row to the shared rules before it is saved.
// Idempotent: an existing collection is left alone.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		if _, err := txApp.FindCollectionByNameOrId("community_contributions"); err == nil {
			return nil
		}
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("community_contributions: users collection not found: %v", err)
			return nil
		}
		owner := types.Pointer("user = @request.auth.id")
		create := types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		col := core.NewBaseCollection("community_contributions")
		col.ListRule, col.ViewRule, col.CreateRule = owner, owner, create
		col.UpdateRule, col.DeleteRule = nil, nil
		col.Fields.Add(&core.RelationField{Name: "user", Required: true, MaxSelect: 1, CollectionId: users.Id, CascadeDelete: true})
		col.Fields.Add(&core.TextField{Name: "project", Required: true, Max: 60})
		col.Fields.Add(&core.TextField{Name: "run_id", Required: true, Max: 80})
		col.Fields.Add(&core.TextField{Name: "component", Required: true, Max: 20})
		col.Fields.Add(&core.NumberField{Name: "units"})
		col.Fields.Add(&core.JSONField{Name: "minerals", MaxSize: 2000})
		col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
		col.Indexes = []string{
			"CREATE UNIQUE INDEX idx_community_contrib_run ON community_contributions (user, project, run_id)",
			"CREATE INDEX idx_community_contrib_project ON community_contributions (project, component)",
		}
		return txApp.Save(col)
	}, nil)
}
