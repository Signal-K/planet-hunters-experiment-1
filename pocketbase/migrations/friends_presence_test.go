package migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestEnsureFriendsPresenceSchemaIsIdempotent(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()

	if _, err := app.FindCollectionByNameOrId("users"); err != nil {
		users := core.NewAuthCollection("users")
		if err := app.Save(users); err != nil {
			t.Fatal(err)
		}
	}
	for run := 0; run < 2; run++ {
		if err := ensureFriendsPresenceSchema(app); err != nil {
			t.Fatal(err)
		}
	}

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil || users.Fields.GetByName("lastExchangeAt") == nil {
		t.Fatalf("users must gain lastExchangeAt, got %v", err)
	}
	for _, name := range []string{"friendships", "friend_gifts"} {
		collection, err := app.FindCollectionByNameOrId(name)
		if err != nil {
			t.Fatalf("%s collection missing: %v", name, err)
		}
		if collection.ListRule == nil || collection.ViewRule == nil || collection.CreateRule != nil || collection.UpdateRule != nil || collection.DeleteRule != nil {
			t.Fatalf("%s must allow only authenticated participant reads and server-mediated writes", name)
		}
	}
}
