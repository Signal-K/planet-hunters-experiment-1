package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
)

// SSL-647: the first contract came from the starter-bulk template (cargo 4 to 8) and could ask for 7U or 8U,
// more than the free Explorer's 6U hold. main.go's seed now writes 6, but seeding only inserts a missing row, so
// databases that already seeded the template keep cargo_max 8. pb_migrations/1780713600_starter_bulk_cargo_cap.js
// says the same thing but jsvm is not registered and the Fly image never ships that directory, so it never runs;
// this is the compiled equivalent. Idempotent: a row already at 6 or lower is left alone.
const (
	starterBulkSlug     = "starter-bulk"
	starterBulkCargoCap = 6.0
)

// cappedStarterBulkCargo returns the cargo_max the template should have and whether it changed.
func cappedStarterBulkCargo(current float64) (float64, bool) {
	if current > starterBulkCargoCap {
		return starterBulkCargoCap, true
	}
	return current, false
}

func capStarterBulkCargo(app core.App) error {
	record, err := app.FindFirstRecordByData("mission_templates", "slug", starterBulkSlug)
	if err != nil {
		log.Printf("starter_bulk_cargo_cap: %s template not found: %v", starterBulkSlug, err)
		return nil
	}
	capped, changed := cappedStarterBulkCargo(record.GetFloat("cargo_max"))
	if !changed {
		return nil
	}
	record.Set("cargo_max", capped)
	return app.Save(record)
}

func init() {
	core.AppMigrations.Register(capStarterBulkCargo, nil)
}
