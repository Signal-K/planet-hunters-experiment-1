package migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestCappedStarterBulkCargo(t *testing.T) {
	if got, changed := cappedStarterBulkCargo(8); !changed || got != 6 {
		t.Fatalf("a seeded cargo_max of 8 should drop to 6, got %v (changed=%v)", got, changed)
	}
	if got, changed := cappedStarterBulkCargo(6); changed || got != 6 {
		t.Fatalf("6 is already the cap, got %v (changed=%v)", got, changed)
	}
	if got, changed := cappedStarterBulkCargo(4); changed || got != 4 {
		t.Fatalf("a lower cap must not be raised, got %v (changed=%v)", got, changed)
	}
}

func TestCapStarterBulkCargoOnARealDatabase(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	col := core.NewBaseCollection("mission_templates")
	col.Fields.Add(&core.TextField{Name: "slug", Required: true})
	col.Fields.Add(&core.NumberField{Name: "cargo_max"})
	if err := app.Save(col); err != nil {
		t.Fatal(err)
	}
	for slug, cargo := range map[string]float64{"starter-bulk": 8, "other": 8} {
		r := core.NewRecord(col)
		r.Set("slug", slug)
		r.Set("cargo_max", cargo)
		if err := app.Save(r); err != nil {
			t.Fatal(err)
		}
	}
	for run := 0; run < 2; run++ {
		if err := capStarterBulkCargo(app); err != nil {
			t.Fatal(err)
		}
	}
	starter, _ := app.FindFirstRecordByData("mission_templates", "slug", "starter-bulk")
	other, _ := app.FindFirstRecordByData("mission_templates", "slug", "other")
	if starter.GetFloat("cargo_max") != 6 {
		t.Fatalf("starter-bulk should be capped at 6, got %v", starter.GetFloat("cargo_max"))
	}
	if other.GetFloat("cargo_max") != 8 {
		t.Fatalf("another template must be left alone, got %v", other.GetFloat("cargo_max"))
	}
}
