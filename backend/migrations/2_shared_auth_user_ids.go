package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		replacements := map[string]string{
			"structures": "owner",
			"rockets":    "owner",
			"missions":   "user",
			"inventory":  "owner",
			"research":   "user",
		}

		for collectionName, fieldName := range replacements {
			collection, err := app.FindCollectionByNameOrId(collectionName)
			if err != nil {
				return err
			}

			collection.Fields.RemoveByName(fieldName)
			if err := app.Save(collection); err != nil {
				return err
			}

			collection.Fields.Add(&core.TextField{
				Name:     fieldName,
				Required: true,
			})

			if err := app.Save(collection); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		collections := map[string]string{
			"structures": "_pb_users_auth_",
			"rockets":    "_pb_users_auth_",
			"missions":   "_pb_users_auth_",
			"inventory":  "_pb_users_auth_",
			"research":   "_pb_users_auth_",
		}

		for collectionName, collectionId := range collections {
			collection, err := app.FindCollectionByNameOrId(collectionName)
			if err != nil {
				return err
			}

			fieldName := "owner"
			if collectionName == "missions" || collectionName == "research" {
				fieldName = "user"
			}

			collection.Fields.RemoveByName(fieldName)
			if err := app.Save(collection); err != nil {
				return err
			}

			collection.Fields.Add(&core.RelationField{
				Name:          fieldName,
				Required:      true,
				CollectionId:  collectionId,
				CascadeDelete: false,
			})

			if err := app.Save(collection); err != nil {
				return err
			}
		}

		return nil
	})
}
