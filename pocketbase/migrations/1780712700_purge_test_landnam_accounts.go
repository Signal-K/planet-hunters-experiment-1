package migrations

import (
	"log"

	"github.com/pocketbase/pocketbase/core"
)

// KES-149: identify and purge AI/agent and Cypress test accounts from the
// live PocketBase data. Every automated test account across this repo (all
// cypress/e2e/**/*.cy.ts specs, plus manual Claude-in-Chrome playtests) uses
// the @landnam.test email domain specifically because it is an
// IANA-reserved, non-routable TLD (RFC 2606) — no real player can ever hold
// an address on it. That makes it a safe, unambiguous filter for an
// unattended migration: this can only ever match synthetic test data, never
// a real user, no matter how broadly the pattern is applied.
//
// game_states.user has cascadeDelete: true (see ensureCollections in
// main.go), so deleting the matching users rows automatically removes their
// game_states rows too — no separate query needed for that collection.
//
// This is a compiled .go migration, not a pb_migrations/*.js file: this repo
// never registers the jsvm plugin, so .js migration files are never actually
// interpreted, and even .go app-migrations only run via the `migrate up` CLI
// subcommand — which is why fly.toml now has a release_command running it on
// every deploy. See KES-149 for the full investigation.
func init() {
	core.AppMigrations.Register(func(txApp core.App) error {
		usersCollection, err := txApp.FindCollectionByNameOrId("users")
		if err != nil {
			log.Printf("purge_test_landnam_accounts: users collection not found: %v", err)
			return nil
		}

		matched, err := txApp.FindRecordsByFilter(
			usersCollection.Id,
			"email ~ {:suffix}",
			"",
			0,
			0,
			map[string]any{"suffix": "@landnam.test"},
		)
		if err != nil {
			log.Printf("purge_test_landnam_accounts: query failed: %v", err)
			return nil
		}

		log.Printf("purge_test_landnam_accounts: found %d test account(s) to purge", len(matched))
		for _, record := range matched {
			log.Printf("purge_test_landnam_accounts: deleting user %s (%s)", record.Id, record.GetString("email"))
			if err := txApp.Delete(record); err != nil {
				log.Printf("purge_test_landnam_accounts: failed to delete %s: %v", record.Id, err)
			}
		}
		log.Print("purge_test_landnam_accounts: done")

		return nil
	}, func(txApp core.App) error {
		// No-op: purged test data is not restored on rollback.
		return nil
	}, "1780712700_purge_test_landnam_accounts.go")
}
