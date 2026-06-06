package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/types"
)

func main() {
	app := pocketbase.New()

	// Register auto-migration plugin
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	// Initial Landnam collections Go migration
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// Ensure collections exist on serve
		// We could also use the formal migration system, but for simplicity here:
		ensureCollections(app)
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func ensureCollections(app core.App) {
	// users (auth)
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		users = core.NewAuthCollection("users")
		users.Fields.Add(&core.TextField{
			Name: "displayName",
			Max:  80,
		})
		if err := app.Save(users); err != nil {
			log.Printf("failed to save users collection: %v", err)
		}
	}

	// game_states
	if _, err := app.FindCollectionByNameOrId("game_states"); err != nil {
		gameStates := core.NewBaseCollection("game_states")
		gameStates.ListRule = types.Pointer("user = @request.auth.id")
		gameStates.ViewRule = types.Pointer("user = @request.auth.id")
		gameStates.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		gameStates.UpdateRule = types.Pointer("user = @request.auth.id")
		gameStates.DeleteRule = types.Pointer("user = @request.auth.id")
		
		gameStates.Fields.Add(&core.RelationField{
			Name:          "user",
			Required:      true,
			MaxSelect:     1,
			CollectionId:  users.Id,
			CascadeDelete: true,
		})
		gameStates.Fields.Add(&core.JSONField{
			Name:     "state",
			Required: true,
			MaxSize:  200000,
		})
		gameStates.Indexes = []string{
			"CREATE UNIQUE INDEX idx_game_states_user ON game_states (user)",
		}

		if err := app.Save(gameStates); err != nil {
			log.Printf("failed to save game_states collection: %v", err)
		}
	}

	// classifications
	if _, err := app.FindCollectionByNameOrId("classifications"); err != nil {
		classifications := core.NewBaseCollection("classifications")
		classifications.ListRule = types.Pointer("user = @request.auth.id")
		classifications.ViewRule = types.Pointer("user = @request.auth.id")
		classifications.CreateRule = types.Pointer("@request.auth.id != \"\" && user = @request.auth.id")
		classifications.UpdateRule = types.Pointer("user = @request.auth.id")
		classifications.DeleteRule = types.Pointer("user = @request.auth.id")

		classifications.Fields.Add(&core.RelationField{
			Name:          "user",
			Required:      true,
			MaxSelect:     1,
			CollectionId:  users.Id,
			CascadeDelete: true,
		})
		classifications.Fields.Add(&core.TextField{
			Name:     "candidate",
			Required: true,
			Max:      80,
		})
		classifications.Fields.Add(&core.SelectField{
			Name:      "verdict",
			Required:  true,
			MaxSelect: 1,
			Values:    []string{"planet", "not_planet"},
		})
		classifications.Indexes = []string{
			"CREATE INDEX idx_classifications_user_candidate ON classifications (user, candidate)",
		}

		if err := app.Save(classifications); err != nil {
			log.Printf("failed to save classifications collection: %v", err)
		}
	}
}
