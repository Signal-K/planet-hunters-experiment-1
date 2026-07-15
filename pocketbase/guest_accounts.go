package main

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// guestStaleAfter is how long an unconverted guest account's game state is
// left fully populated before being archived down to a dormant stub.
const guestStaleAfter = 30 * 24 * time.Hour

// guestEmailSuffix matches the throwaway "guest_<random>@landnam.guest"
// accounts web/lib/guestAuth.ts creates on the *shared* backend (pbShared,
// port 8090), not this one, whenever a player taps "Continue without
// account". This backend only ever learns a user's email once they exchange
// their shared session for a native token (landnam_auth.go), which mirrors
// it onto this collection's "users" row with the same record id — that's
// the only guest signal available here.
const guestEmailSuffix = "@landnam.guest"

// registerGuestStateArchival schedules a daily job that archives (does not
// delete) game_states belonging to guest accounts that have gone untouched
// for guestStaleAfter. Archiving replaces the full state JSON blob (up to
// 200KB — see game_states.state in main.go) with a small dormant stub,
// shrinking storage while keeping the row, its id, and mission_log history
// intact in case it's later needed (e.g. survey-response linkage). Neither
// the guest's "users" row nor its mission_log rows are ever deleted here.
func registerGuestStateArchival(app core.App) {
	app.Cron().MustAdd("guest_state_archival", "0 3 * * *", func() {
		archiveStaleGuestStates(app)
	})
}

func archiveStaleGuestStates(app core.App) {
	usersCollection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		log.Printf("guest archival: users collection not found: %v", err)
		return
	}

	cutoff := time.Now().Add(-guestStaleAfter)
	guests, err := app.FindRecordsByFilter(
		usersCollection.Id,
		"email ~ {:suffix} && created < {:cutoff}",
		"-created",
		0,
		0,
		map[string]any{
			"suffix": guestEmailSuffix,
			"cutoff": cutoff,
		},
	)
	if err != nil {
		log.Printf("guest archival: query failed: %v", err)
		return
	}

	gameStatesCollection, err := app.FindCollectionByNameOrId("game_states")
	if err != nil {
		log.Printf("guest archival: game_states collection not found: %v", err)
		return
	}

	for _, guest := range guests {
		// Defensive: "~" is a substring match, so double-check the suffix
		// actually anchors the end of the email rather than appearing
		// mid-string somewhere unexpected.
		if !strings.HasSuffix(guest.GetString("email"), guestEmailSuffix) {
			continue
		}

		state, err := app.FindFirstRecordByFilter(
			gameStatesCollection.Id,
			"user = {:id}",
			map[string]any{"id": guest.Id},
		)
		if err != nil {
			continue // no game_states row for this guest — nothing to archive
		}

		if isArchivedState(state) {
			continue // already archived on a previous run — avoid rewriting daily
		}

		state.Set("state", map[string]any{
			"dormant":    true,
			"archivedAt": types.NowDateTime().String(),
		})
		if err := app.Save(state); err != nil {
			log.Printf("guest archival: failed to archive game_states for %s: %v", guest.Id, err)
		}
	}
}

func isArchivedState(state *core.Record) bool {
	raw, ok := state.Get("state").(types.JSONRaw)
	if !ok || len(raw) == 0 {
		return false
	}
	var parsed struct {
		Dormant bool `json:"dormant"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return false
	}
	return parsed.Dormant
}
