package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
)

// SSL-488: native Swift clients sign in with Apple (and Clerk-issued session
// tokens) instead of the shared-backend session. Each external identity is
// bound 1:1 to a Landnam users row by its stable provider subject, stored here
// so a returning player always lands on the same game_states row.
//
// Idempotent, and a no-op when users does not exist yet: ensureCollections in
// main.go adds the same fields on a fresh install.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("users_apple_clerk_identity: users collection not found, skipping: %v", err)
			return nil
		}
		changed := false
		for _, name := range []string{"appleSub", "clerkId"} {
			if users.Fields.GetByName(name) == nil {
				users.Fields.Add(&core.TextField{Name: name, Max: 128})
				changed = true
			}
		}
		users.AddIndex("idx_users_apple_sub", true, "appleSub", "appleSub != ''")
		users.AddIndex("idx_users_clerk_id", true, "clerkId", "clerkId != ''")
		if changed {
			log.Printf("users_apple_clerk_identity: added appleSub/clerkId")
		}
		return txApp.Save(users)
	}, func(txApp core.App) error {
		users, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			return nil
		}
		users.RemoveIndex("idx_users_apple_sub")
		users.RemoveIndex("idx_users_clerk_id")
		users.Fields.RemoveByName("appleSub")
		users.Fields.RemoveByName("clerkId")
		return txApp.Save(users)
	})
}
