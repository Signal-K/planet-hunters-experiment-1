package migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestOrionidsEventProofsSchema(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()

	col, err := app.FindCollectionByNameOrId("event_proofs")
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"user", "event_id", "mission_id", "mission_run_id", "target_id", "proof_type", "screenshot", "caption", "captured_at"} {
		if col.Fields.GetByName(name) == nil {
			t.Fatalf("event_proofs is missing %q", name)
		}
	}
	if col.Fields.GetByName("screenshot").(*core.TextField).Max != 2000000 {
		t.Fatal("event_proofs screenshot field must retain the bounded data URL limit")
	}
}
