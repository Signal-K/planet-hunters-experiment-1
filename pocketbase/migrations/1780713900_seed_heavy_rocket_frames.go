package migrations

import (
	"github.com/pocketbase/pocketbase/core"
)

// The Surveyor is built on hull-mk3, but the rocket_parts seed never added it or the bulk hauler frame, so live
// clients validated the Surveyor against a missing chassis. pb_migrations/1780713900_seed_heavy_rocket_frames.js says
// the same thing but jsvm is not registered and the Fly image never ships that directory, so it never runs; this is
// the compiled equivalent. Idempotent: an existing row is updated in place.
type heavyFrame struct {
	slug, name, img string
	mass, cargo     float64
}

var heavyFrames = []heavyFrame{
	{"hull-mk3", "Hull MK3 – Heavy Frame", "/parts/hull_mk3_heavy_t3.png", 4, 18},
	{"hull-hauler", "Bulk Hauler Chassis", "/parts/bulk_hauler_t3.png", 3, 24},
}

func seedHeavyRocketFrames(app core.App) error {
	col, err := app.FindCollectionByNameOrId("rocket_parts")
	if err != nil {
		return nil
	}
	for _, f := range heavyFrames {
		record, err := app.FindFirstRecordByData("rocket_parts", "slug", f.slug)
		if err != nil {
			record = core.NewRecord(col)
		}
		record.Set("slug", f.slug)
		record.Set("name", f.name)
		record.Set("part_type", "chassis")
		record.Set("tier", 3)
		record.Set("locked", false)
		record.Set("img", f.img)
		record.Set("mass", f.mass)
		record.Set("cargo_capacity", f.cargo)
		if err := app.Save(record); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	core.AppMigrations.Register(seedHeavyRocketFrames, nil)
}
