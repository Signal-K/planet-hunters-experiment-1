package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		playerGameStates := core.NewBaseCollection("player_game_states")

		playerGameStates.Fields.Add(&core.TextField{
			Name:     "owner",
			Required: true,
		})
		playerGameStates.Fields.Add(&core.NumberField{
			Name: "save_version",
		})
		playerGameStates.Fields.Add(&core.JSONField{
			Name:     "game_state",
			Required: true,
		})
		playerGameStates.Fields.Add(&core.TextField{
			Name: "client_updated_at",
		})
		playerGameStates.Fields.Add(&core.TextField{
			Name: "last_synced_at",
		})
		playerGameStates.Fields.Add(&core.JSONField{
			Name: "configuration",
		})

		playerGameStates.Indexes = append(
			playerGameStates.Indexes,
			"CREATE UNIQUE INDEX idx_player_game_states_owner ON player_game_states (owner)",
		)

		return app.Save(playerGameStates)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("player_game_states")
		if err != nil {
			return nil
		}

		return app.Delete(collection)
	})
}
