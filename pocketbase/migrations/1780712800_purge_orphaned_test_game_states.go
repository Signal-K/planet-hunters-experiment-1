package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
)

// KES-149 follow-up: 1780712700_purge_test_landnam_accounts.go deleted the
// @landnam.test users rows but left their game_states rows behind — verified
// live via the PocketBase Admin API after that migration ran (GET
// /api/collections/game_states/records/<purged-user-id> still returned the
// full record). Root cause: game_states.user is a plain text field in the
// live production schema, not an actual PocketBase relation field, so there
// is no cascadeDelete — an earlier assumption based on a pb_migrations *.js
// file's stated intent (never actually executed, since jsvm isn't
// registered) turned out not to match the deployed collection schema.
//
// This migration deletes any game_states row whose "user" id no longer
// exists in the users collection. That's safe specifically because
// landnam-auth exchange (landnam_auth.go) is the only path that ever creates
// a users row, and game_states ownership rules require a matching users
// record — so an orphaned game_states row can only be leftover from a
// deleted user, never a legitimate pending-creation race.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		usersCollection, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("purge_orphaned_test_game_states: users collection not found: %v", err)
			return nil
		}

		gameStatesCollection, err := txApp.FindCollectionByNameOrId("game_states")
		if err != nil {
			log.Printf("purge_orphaned_test_game_states: game_states collection not found: %v", err)
			return nil
		}

		allStates, err := txApp.FindRecordsByFilter(gameStatesCollection.Id, "", "", 0, 0)
		if err != nil {
			log.Printf("purge_orphaned_test_game_states: query failed: %v", err)
			return nil
		}

		orphaned := 0
		for _, state := range allStates {
			userId := state.GetString("user")
			if userId == "" {
				continue
			}
			if _, err := txApp.FindRecordById(usersCollection, userId); err == nil {
				continue // owning user still exists
			}
			orphaned++
			log.Printf("purge_orphaned_test_game_states: deleting orphaned game_states %s (user %s)", state.Id, userId)
			if err := txApp.Delete(state); err != nil {
				log.Printf("purge_orphaned_test_game_states: failed to delete %s: %v", state.Id, err)
			}
		}
		log.Printf("purge_orphaned_test_game_states: done, removed %d orphaned row(s)", orphaned)

		return nil
	}, func(txApp core.App) error {
		// No-op: purged test data is not restored on rollback.
		return nil
	}, "1780712800_purge_orphaned_test_game_states.go")
}
