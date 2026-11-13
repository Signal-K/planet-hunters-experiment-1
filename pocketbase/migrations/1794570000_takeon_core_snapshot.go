package migrations

import "github.com/pocketbase/pocketbase/core"

// SSL-778/837: the existing native snapshot column is now shared by web too.
// Older JS-only migration histories did not reach the Go server's upgrade path.
func ensureTakeonCoreSnapshot(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("voxel_worlds")
	if err != nil {
		return nil
	} // Fresh installs create the complete schema on boot.
	if collection.Fields.GetByName("snapshot") != nil {
		return nil
	}
	collection.Fields.Add(&core.TextField{Name: "snapshot", Max: 2000000})
	return app.Save(collection)
}
func init() { core.AppMigrations.Register(ensureTakeonCoreSnapshot, nil) }
