package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
	"testing"
)

func TestTakeonCoreSnapshotUpgradeIsIdempotent(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	collection := core.NewBaseCollection("voxel_worlds")
	if err = app.Save(collection); err != nil {
		t.Fatal(err)
	}
	old := core.NewRecord(collection)
	if err = app.Save(old); err != nil {
		t.Fatal(err)
	}
	if err = ensureTakeonCoreSnapshot(app); err != nil {
		t.Fatal(err)
	}
	collection, _ = app.FindCollectionByNameOrId("voxel_worlds")
	field := collection.Fields.GetByName("snapshot")
	if field == nil {
		t.Fatal("snapshot field missing")
	}
	id := field.GetId()
	record, _ := app.FindRecordById(collection, old.Id)
	record.Set("snapshot", "eyJ2IjoxfQ==")
	if err = app.Save(record); err != nil {
		t.Fatal(err)
	}
	if err = ensureTakeonCoreSnapshot(app); err != nil {
		t.Fatal(err)
	}
	collection, _ = app.FindCollectionByNameOrId("voxel_worlds")
	if collection.Fields.GetByName("snapshot").GetId() != id {
		t.Fatal("existing snapshot field was recreated")
	}
	record, _ = app.FindRecordById(collection, old.Id)
	if record.GetString("snapshot") != "eyJ2IjoxfQ==" {
		t.Fatal("existing snapshot was changed")
	}
}
