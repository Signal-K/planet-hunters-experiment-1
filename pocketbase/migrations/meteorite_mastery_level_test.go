package migrations

import (
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestRelaxMasteryLevelAcceptsZero(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	// The test app already ran the compiled migrations, which include the Required level field and this fix,
	// so put the field back to the production shape first.
	col, err := app.FindCollectionByNameOrId("meteorite_mastery")
	if err != nil {
		t.Fatal(err)
	}
	col.Fields.GetByName("level").(*core.NumberField).Required = true
	if err := app.Save(col); err != nil {
		t.Fatal(err)
	}
	hasLevelError := func() bool {
		r := core.NewRecord(col)
		r.Set("level", 0)
		err := app.Validate(r)
		return err != nil && strings.Contains(err.Error(), "level:")
	}
	if !hasLevelError() {
		t.Fatal("a Required level should reject 0 before the migration")
	}
	for i := 0; i < 2; i++ {
		if err := relaxMasteryLevel(app); err != nil {
			t.Fatal(err)
		}
	}
	col, _ = app.FindCollectionByNameOrId("meteorite_mastery")
	if hasLevelError() {
		t.Fatal("level 0 should be accepted after the migration")
	}
}
