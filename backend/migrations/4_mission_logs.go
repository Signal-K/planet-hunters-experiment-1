package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		missionLogs := core.NewBaseCollection("mission_logs")

		missionLogs.Fields.Add(&core.TextField{
			Name:     "owner",
			Required: true,
		})
		missionLogs.Fields.Add(&core.TextField{
			Name: "rocket",
		})
		missionLogs.Fields.Add(&core.TextField{
			Name: "target_id",
		})
		missionLogs.Fields.Add(&core.TextField{
			Name:     "action",
			Required: true,
		})
		missionLogs.Fields.Add(&core.NumberField{
			Name: "payout_francs",
		})
		missionLogs.Fields.Add(&core.JSONField{
			Name: "cargo_secured",
		})
		missionLogs.Fields.Add(&core.TextField{
			Name: "logged_at",
		})
		missionLogs.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		missionLogs.Indexes = append(
			missionLogs.Indexes,
			"CREATE INDEX idx_mission_logs_owner ON mission_logs (owner)",
		)

		return app.Save(missionLogs)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("mission_logs")
		if err != nil {
			return nil
		}

		return app.Delete(collection)
	})
}
