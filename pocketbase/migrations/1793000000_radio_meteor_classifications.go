package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// SSL-714: players box meteor echoes in real BRAMS radio spectrograms served by the Zooniverse
// Panoptes API (Radio Meteor Zoo, project 2471). Classifications are kept here, on Landnam's side;
// nothing is sent to Zooniverse. Boxes are in source-image pixels with the Panoptes rectangle-tool
// shape ({x, y, width, height}) so they can be exported to the project later if BRAMS agrees.
// Idempotent: an existing collection is left alone.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		if _, err := txApp.FindCollectionByNameOrId("radio_meteor_classifications"); err == nil {
			return nil
		}
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("radio_meteor_classifications: users collection not found: %v", err)
			return nil
		}
		owner := types.Pointer("user = @request.auth.id")
		create := types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		col := core.NewBaseCollection("radio_meteor_classifications")
		col.ListRule, col.ViewRule, col.CreateRule, col.UpdateRule, col.DeleteRule = owner, owner, create, owner, owner
		col.Fields.Add(&core.RelationField{Name: "user", Required: true, MaxSelect: 1, CollectionId: users.Id, CascadeDelete: true})
		col.Fields.Add(&core.TextField{Name: "subject_id", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "workflow_id", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "project_id", Required: true, Max: 40})
		col.Fields.Add(&core.TextField{Name: "image_url", Max: 300})
		col.Fields.Add(&core.TextField{Name: "filename", Max: 120})
		col.Fields.Add(&core.NumberField{Name: "image_width"})
		col.Fields.Add(&core.NumberField{Name: "image_height"})
		col.Fields.Add(&core.JSONField{Name: "boxes", MaxSize: 20000})
		col.Fields.Add(&core.NumberField{Name: "echo_count"})
		col.Fields.Add(&core.TextField{Name: "event_id", Max: 80})
		col.Fields.Add(&core.NumberField{Name: "submitted_at", Required: true})
		col.Indexes = []string{"CREATE UNIQUE INDEX idx_radio_meteor_user_subject ON radio_meteor_classifications (user, subject_id)"}
		return txApp.Save(col)
	}, nil)
}
